terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 5.0.0, < 6.0.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.5.0, < 4.0.0"
    }
  }

  cloud {

    organization = "only_me"

    workspaces {
      name = "fide-docdb"
    }
  }
}

provider "azurerm" {
  use_oidc        = true
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id

  # Required resource providers (Microsoft.DocumentDB, Microsoft.ContainerService,
  # Microsoft.Network) are registered once as an account prerequisite, not
  # managed here — see README's "One-time Azure OIDC setup" section.
  features {}
}
