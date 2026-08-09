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

  # azurerm defaults to registering no resource providers at all; explicitly
  # register the one this config needs (Cosmos DB / Mongo cluster).
  resource_providers_to_register = ["Microsoft.DocumentDB"]

  features {}
}
