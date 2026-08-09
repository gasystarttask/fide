resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

resource "azurerm_resource_group" "this" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

resource "random_password" "mongo_admin" {
  length           = 20
  special          = true
  override_special = "!#$%&*()-_=+"
}

# Azure Cosmos DB for MongoDB (vCore) — the managed service built on the
# open-source DocumentDB engine used locally in services/compose.yml.
# compute_tier = "Free" gives one free cluster per subscription: fixed at
# 32GB storage, single shard, no high availability, free for the account's
# lifetime.
resource "azurerm_mongo_cluster" "this" {
  name                = "${var.mongo_cluster_name_prefix}-${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location

  administrator_username = var.administrator_username
  administrator_password = random_password.mongo_admin.result

  compute_tier           = "Free"
  high_availability_mode = "Disabled"
  shard_count            = 1
  storage_size_in_gb     = 32
  version                = var.mongo_version
  public_network_access  = "Enabled"

  tags = var.tags
}

resource "azurerm_mongo_cluster_firewall_rule" "allow_azure_services" {
  count = var.allow_azure_services ? 1 : 0

  name             = "AllowAzureServices"
  mongo_cluster_id = azurerm_mongo_cluster.this.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

resource "azurerm_mongo_cluster_firewall_rule" "allow_all" {
  count = var.allow_all_ips ? 1 : 0

  name             = "AllowAllIPs"
  mongo_cluster_id = azurerm_mongo_cluster.this.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "255.255.255.255"
}

resource "azurerm_mongo_cluster_firewall_rule" "allowed" {
  for_each = { for r in var.allowed_ip_ranges : r.name => r }

  name             = each.value.name
  mongo_cluster_id = azurerm_mongo_cluster.this.id
  start_ip_address = each.value.start_ip
  end_ip_address   = each.value.end_ip
}
