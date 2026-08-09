# iac — Azure DocumentDB (Cosmos DB for MongoDB vCore) free tier

Terraform for a free-tier **Azure Cosmos DB for MongoDB (vCore)** cluster — the
managed Azure service built on the same open-source DocumentDB engine used
locally in `services/compose.yml` (`ghcr.io/documentdb/documentdb-local`).
It's MongoDB wire-protocol compatible, so app code (`DATABASE_URL=mongodb://...`)
doesn't change between local dev and this deployment.

## What gets created

- A resource group
- One `azurerm_mongo_cluster` with `compute_tier = "Free"`:
  - 32 GB storage, single shard, no high availability — fixed by the free tier
  - Free for the lifetime of the account
  - **Only one free-tier cluster is allowed per Azure subscription**
- Firewall rules controlling public network access (see below)

## Prerequisites

- Terraform >= 1.5
- An Azure subscription
- This workspace runs in HCP Terraform (`only_me`/`fide-docdb`), which executes
  plans/applies on remote runners with no Azure CLI and no interactive login.
  Auth is via **Azure OIDC dynamic credentials** — set this up once (see below)
  before the first `terraform plan`.

## One-time Azure OIDC setup (dynamic credentials)

HCP Terraform authenticates to Azure by presenting a short-lived OIDC token
from `https://app.terraform.io` to an Entra ID app registration — no client
secret is stored anywhere.

1. **Create an app registration + service principal**, and grant it
   `Contributor` (or a narrower custom role) on the target subscription or
   resource group:
   ```bash
   az ad app create --display-name fide-docdb-hcp-terraform
   # note the appId (client_id) from the output
   az ad sp create-for-rbac --name fide-docdb-hcp-terraform \
     --role Contributor --scopes /subscriptions/<subscription_id> \
     --create-cert  # or configure the role assignment separately if you already have the app
   ```
   (Any equivalent Portal flow works too — the OIDC federated credential is
   what matters, not how the app/SP was created.)

2. **Add two federated credentials** on the app registration (Entra ID portal
   → App registrations → your app → Certificates & secrets → Federated
   credentials → scenario "Other issuer"):
   - Issuer: `https://app.terraform.io`
   - Subject: HCP Terraform does not display this string anywhere — build it
     yourself from the pattern below. Find your project name on the
     workspace's page (shown in the breadcrumb at the top, e.g.
     `only_me / <project name> / fide-docdb`; a workspace not assigned to a
     project belongs to "Default Project"):
     ```
     organization:only_me:project:<project-name>:workspace:fide-docdb:run_phase:plan
     organization:only_me:project:<project-name>:workspace:fide-docdb:run_phase:apply
     ```
   - Create one federated credential per line above (two total — `plan` and `apply`)
   - Audience: default (`api://AzureADTokenExchange`)

3. **Set these variables on the `fide-docdb` workspace** (Environment variable
   category, not Terraform variable):
   | Key | Value |
   |---|---|
   | `TFC_AZURE_PROVIDER_AUTH` | `true` |
   | `TFC_AZURE_RUN_CLIENT_ID` | the app's client ID |
   | `ARM_SUBSCRIPTION_ID` | your subscription ID |
   | `ARM_TENANT_ID` | your Entra ID tenant ID |

   Do **not** set `ARM_CLIENT_ID` or `ARM_CLIENT_SECRET` — HCP Terraform
   injects the client ID and OIDC token itself based on `TFC_AZURE_*`.

4. **Resource provider registration.** The azurerm provider registers zero
   resource providers by default; `versions.tf` explicitly tells it to
   register `Microsoft.DocumentDB` (the RP behind Cosmos DB / Mongo clusters)
   during apply. This requires the service principal from step 1 to have
   `register/action` permission on the subscription, which `Contributor`
   already includes — no extra step needed if you followed step 1 as-is. If
   you scoped a narrower custom role instead, either add that permission or
   register the provider once yourself with an account that has it:
   ```bash
   az provider register --namespace Microsoft.DocumentDB
   az provider show --namespace Microsoft.DocumentDB --query registrationState
   ```

## Usage

```bash
cd iac
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars as needed

terraform init
terraform plan
terraform apply
```

Retrieve credentials after apply:

```bash
terraform output administrator_username
terraform output -raw administrator_password
terraform output -raw mongo_connection_string
```

## Network access

By default `allow_azure_services = true` adds a firewall rule for Azure
datacenter IP ranges. To reach the cluster from your workstation, add your
public IP to `allowed_ip_ranges` in `terraform.tfvars`. Avoid setting
`allow_all_ips = true` unless you understand the exposure — the cluster still
requires authentication, but it opens the endpoint to the whole internet.

## Notes

- `location` defaults to `westeurope`; free-tier availability varies by
  region — check the Azure Cosmos DB for MongoDB vCore docs if you change it.
- Destroying and recreating the cluster does not free up your subscription's
  free-tier slot instantly — deletion must fully complete first.
