[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# tidb-pulumi

This example deploys tidb instance onto a running Kubernetes cluster using Pulumi and `@pulumi/kubernetes`.

## Pre-Requisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Kubernetes for Pulumi](https://www.pulumi.com/docs/intro/cloud-providers/kubernetes/setup/)

## Running the App

Install dependencies:

```sh
$ npm install
```

Create a new stack:

```sh
$ pulumi stack init
```

Preview the deployment of the application:

```sh
$ pulumi preview
```

(Optional) Prepare directory for local pv (refer to name, storageNode and storagePath in `index.ts`):
```sh
# on k8s local pv node
$ mkdir -p /data/tidb
```

Perform the deployment:

```sh
$ pulumi up --skip-preview
```

This deployment is now running, and you can run commands like `kubectl get pods` to see the application's resources.

Use `pulumi stack output` to see the endpoint of the Service that we just deployed:

```sh
$ pulumi stack output
```

Forward this Service port:
```sh
$ kubectl port-forward svc/tidb 4000
```

Connect to tidb:

mysql 5.7:
```sh
$ mysql -h 127.0.0.1 -P 4000 -u root -p
```
mysql 8.0:
```sh
$ mysql -h 127.0.0.1 -P 4000 -u root -p --default-auth=mysql_native_password
```

When you're ready to be done with tidb, you can destroy the instance:
```sh
$ pulumi destroy --skip-preview
```

## Configuration

> index.ts

| Parameter    | Default                                               | Default       |
| ------------ | ----------------------------------------------------- | ------------- |
| name         | Name of pvc, deployment, service                      | tidb          |
| namespace    | Namespace of resources                                | tidb          |
| imageVersion | Image tag                                             | latest        |
| storageClass | Type of persistent volume claim                       | local-storage |
| storageSize  | Size of persistent volume claim                       | 10Gi          |
| storageNode  | Nodename of local storage pv                          | node1         |
| storagePath  | Parent path of local storage pv                       | /data         |
| password     | TiDB password, if not specified, there is no password | pa55w0rd      |
