output "resource_group_name" {
  description = "Name of the created resource group."
  value       = azurerm_resource_group.this.name
}

output "mongo_cluster_name" {
  description = "Name of the Cosmos DB for MongoDB (vCore) free-tier cluster."
  value       = azurerm_mongo_cluster.this.name
}

output "mongo_cluster_id" {
  description = "Resource ID of the Mongo cluster."
  value       = azurerm_mongo_cluster.this.id
}

output "administrator_username" {
  description = "Administrator username for the cluster."
  value       = var.administrator_username
}

output "administrator_password" {
  description = "Generated administrator password for the cluster."
  value       = random_password.mongo_admin.result
  sensitive   = true
}

output "mongo_connection_string" {
  description = "MongoDB connection string for the cluster (includes credentials)."
  value       = azurerm_mongo_cluster.this.connection_strings[0].value
  sensitive   = true
}

output "aks_cluster_name" {
  description = "Name of the AKS cluster."
  value       = azurerm_kubernetes_cluster.this.name
}

output "aks_cluster_id" {
  description = "Resource ID of the AKS cluster."
  value       = azurerm_kubernetes_cluster.this.id
}

output "aks_kube_config" {
  description = "kubeconfig for the AKS cluster. Write to a file and use with kubectl, e.g. `terraform output -raw aks_kube_config > kubeconfig.yaml`."
  value       = azurerm_kubernetes_cluster.this.kube_config_raw
  sensitive   = true
}
