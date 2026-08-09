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

variable "aks_cluster_name_prefix" {
  description = "Prefix for the AKS cluster name and DNS prefix. A random suffix is appended since the DNS prefix must be unique."
  type        = string
  default     = "bible-sg-aks"
}

variable "aks_kubernetes_version" {
  description = "Kubernetes version for the AKS cluster. Leave null to use AKS's current default version."
  type        = string
  default     = null
}

variable "aks_node_count" {
  description = "Number of nodes in the default node pool."
  type        = number
  default     = 1
}

variable "aks_node_vm_size" {
  description = "VM size for the default node pool. AKS's control-plane free tier has no cost, but node VMs bill as normal compute — pick a small/burstable size for a POC."
  type        = string
  default     = "Standard_B2s"
}

variable "aks_os_disk_size_gb" {
  description = "OS disk size (in GB) for nodes in the default node pool."
  type        = number
  default     = 32
}

variable "aks_api_server_authorized_ip_ranges" {
  description = "IP ranges allowed to reach the AKS API server. Leave empty to allow any IP (AKS's default)."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags applied to all created resources."
  type        = map(string)
  default = {
    project     = "bible-sg"
    environment = "poc"
  }
}
