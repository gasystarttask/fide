# AKS control-plane free tier (sku_tier = "Free"): no cost, no uptime SLA.
# Node VMs still bill as normal compute — kept to a single small/burstable
# node by default to minimize cost for a POC.
resource "azurerm_kubernetes_cluster" "this" {
  name                = "${var.aks_cluster_name_prefix}-${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  dns_prefix          = "${var.aks_cluster_name_prefix}-${random_string.suffix.result}"

  sku_tier           = "Free"
  kubernetes_version = var.aks_kubernetes_version

  default_node_pool {
    name            = "default"
    node_count      = var.aks_node_count
    vm_size         = var.aks_node_vm_size
    os_disk_size_gb = var.aks_os_disk_size_gb
  }

  identity {
    type = "SystemAssigned"
  }

  # Required by the provider; "Manual" (the default) keeps classic fixed
  # node-pool behavior instead of Karpenter-style node autoprovisioning.
  node_provisioning_profile {
    mode = "Manual"
  }

  api_server_access_profile {
    authorized_ip_ranges = length(var.aks_api_server_authorized_ip_ranges) > 0 ? var.aks_api_server_authorized_ip_ranges : null
  }

  tags = var.tags
}
