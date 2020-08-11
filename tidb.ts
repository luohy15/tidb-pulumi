import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as kx from "@pulumi/kubernetesx";

export class TiDB extends pulumi.ComponentResource {
  /**
   * Allocate new tidb instance
   * @param name The name of the tidb instance.
   * @param args A bag of arguments to control the tidb instance.
   * @param opts optional resource options.
   */
  namespace: pulumi.Output<string>;
  service: pulumi.Output<string>;
  constructor(args: TiDBArgs, opts?: pulumi.ComponentResourceOptions) {
    super("pkg:index:TiDB", args.name, args, opts);
    const appLabels = { app: args.name };
    const metadata = {
      name: args.name,
      namespace: args.namespace,
    };
    const namespace = new k8s.core.v1.Namespace(
      args.name,
      {
        metadata: {
          name: args.namespace,
        },
      },
      { parent: this }
    );
    const storageclass = new k8s.storage.v1.StorageClass(
      args.name,
      {
        metadata: {
          name: args.storageClass,
        },
        provisioner: "kubernetes.io/no-provisioner",
        volumeBindingMode: "WaitForFirstConsumer",
      },
      { parent: this }
    );
    const pv = new k8s.core.v1.PersistentVolume(
      args.name,
      {
        metadata: {
          name: args.name,
          labels: appLabels,
        },
        spec: {
          storageClassName: args.storageClass,
          capacity: {
            storage: args.storageSize,
          },
          accessModes: ["ReadWriteOnce"],
          local: {
            path: `${args.storagePath}/${args.name}`,
          },
          nodeAffinity: {
            required: {
              nodeSelectorTerms: [
                {
                  matchExpressions: [
                    {
                      key: "kubernetes.io/hostname",
                      operator: "In",
                      values: [args.storageNode],
                    },
                  ],
                },
              ],
            },
          },
        },
      },
      { parent: this }
    );
    const pvc = new k8s.core.v1.PersistentVolumeClaim(
      args.name,
      {
        metadata,
        spec: {
          accessModes: ["ReadWriteOnce"],
          storageClassName: args.storageClass,
          resources: {
            requests: {
              storage: args.storageSize,
            },
          },
          selector: {
            matchLabels: appLabels,
          },
        },
      },
      { parent: this }
    );
    const deployment = new k8s.apps.v1.Deployment(
      args.name,
      {
        metadata,
        spec: {
          selector: { matchLabels: appLabels },
          replicas: 1,
          template: {
            metadata: { labels: appLabels },
            spec: {
              containers: [
                {
                  name: "tidb",
                  image: `pingcap/tidb:${args.imageVersion}`,
                  ports: [
                    {
                      name: "server",
                      containerPort: 4000,
                    },
                    {
                      name: "status",
                      containerPort: 10080,
                    },
                  ],
                  readinessProbe: {
                    tcpSocket: {
                      port: "server",
                    },
                    initialDelaySeconds: 10,
                    timeoutSeconds: 1,
                    periodSeconds: 10,
                  },
                  volumeMounts: [
                    {
                      name: "config",
                      mountPath: "/etc/tidb",
                    },
                  ],
                },
              ],
              volumes: [
                {
                  name: "config",
                  persistentVolumeClaim: {
                    claimName: args.name,
                  },
                },
              ],
            },
          },
        },
      },
      { parent: this }
    );
    const service = new k8s.core.v1.Service(
      args.name,
      {
        metadata,
        spec: {
          type: "ClusterIP",
          ports: [
            {
              name: "server",
              port: 4000,
              targetPort: "server",
            },
            {
              name: "status",
              port: 10080,
              targetPort: "status",
            },
          ],
          selector: {
            app: args.name,
          },
        },
      },
      { parent: this }
    );
    if (args.password && args.password != "") {
      const secret = new k8s.core.v1.Secret(
        args.name,
        {
          metadata,
          stringData: {
            password: `SET PASSWORD FOR 'root'@'%' = '${args.password}'; FLUSH PRIVILEGES;`,
          },
        },
        { parent: this }
      );
      const initjob = new k8s.batch.v1.Job(
        args.name,
        {
          metadata,
          spec: {
            template: {
              spec: {
                restartPolicy: "OnFailure",
                containers: [
                  {
                    name: "tidb-initializer",
                    image: "mysql:5.7",
                    command: [
                      "/bin/sh",
                      "-c",
                      `until mysql -h ${args.name} -P 4000 < /data/init-password.sql; do sleep 2; done`,
                    ],
                    volumeMounts: [
                      {
                        name: "password",
                        mountPath: "/data",
                      },
                    ],
                  },
                ],
                volumes: [
                  {
                    name: "password",
                    secret: {
                      secretName: args.name,
                      items: [{ key: "password", path: "init-password.sql" }],
                    },
                  },
                ],
              },
            },
          },
        },
        { parent: this }
      );
    }
    this.namespace = namespace.metadata.name;
    this.service = service.metadata.name;
    this.registerOutputs({ namespace: this.namespace, service: this.service });
  }
}

export interface TiDBArgs {
  name: string;
  namespace: string;
  imageVersion: string;
  storageClass: string;
  storageSize: string;
  storageNode: string;
  storagePath: string;
  password?: string;
}
