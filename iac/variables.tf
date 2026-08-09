variable "subscription_id" {
  description = "Azure subscription ID. Leave null to fall back to the ARM_SUBSCRIPTION_ID environment variable (set on the HCP Terraform workspace)."
  type        = string
  default     = null
}

variable "tenant_id" {
  description = "Azure AD tenant ID. Leave null to fall back to the ARM_TENANT_ID environment variable (set on the HCP Terraform workspace)."
  type        = string
  default     = null
}

variable "resource_group_name" {
  description = "Name of the Azure resource group to create for the DocumentDB (Cosmos DB for MongoDB vCore) free-tier cluster."
  type        = string
  default     = "rg-bible-sg-docdb-free"
}

variable "location" {
  description = "Azure region to deploy into. Free tier availability varies by region."
  type        = string
  default     = "westeurope"
}

variable "mongo_cluster_name_prefix" {
  description = "Prefix for the Mongo cluster name. A random suffix is appended since the name must be globally unique (it becomes the public DNS hostname)."
  type        = string
  default     = "bible-sg-docdb"
}

variable "mongo_version" {
  description = "MongoDB wire-protocol version for the cluster."
  type        = string
  default     = "7.0"
}

variable "administrator_username" {
  description = "Administrator username for the Mongo cluster."
  type        = string
  default     = "docdbadmin"
}

variable "allow_azure_services" {
  description = "Add a firewall rule allowing access from Azure datacenter IP ranges (0.0.0.0-0.0.0.0), e.g. so other Azure services can reach the cluster."
  type        = bool
  default     = true
}

variable "allow_all_ips" {
  description = "Add a firewall rule allowing access from any IP on the internet (0.0.0.0-255.255.255.255). Authentication is still required, but this widens exposure. Leave false unless you understand the risk."
  type        = bool
  default     = false
}

variable "allowed_ip_ranges" {
  description = "Specific IP ranges to allow through the cluster firewall, e.g. your workstation's public IP."
  type = list(object({
    name     = string
    start_ip = string
    end_ip   = string
  }))
  default = []
}

variable "tags" {
  description = "Tags applied to all created resources."
  type        = map(string)
  default = {
    project     = "bible-sg"
    environment = "poc"
  }
}
