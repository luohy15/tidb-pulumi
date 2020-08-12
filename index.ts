import { TiDB, TiDBArgs } from "./tidb"

let tidb = new TiDB({
    name: "tidb",
    namespace: "tidb",
    imageVersion: "latest",
    storageClass: "local-storage",
    storageSize: "10Gi",
    localStorage: false,
    storageNode: "node1",
    storagePath: "/data",
    password: "pa55w0rd",
})
export const namespace = tidb.namespace
export const service = tidb.service