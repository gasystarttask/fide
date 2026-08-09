# iac — Azure DocumentDB + AKS free tier

Terraform for:
- A free-tier **Azure Cosmos DB for MongoDB (vCore)** cluster — the managed
  Azure service built on the same open-source DocumentDB engine used locally
  in `services/compose.yml` (`ghcr.io/documentdb/documentdb-local`). It's
  MongoDB wire-protocol compatible, so app code (`DATABASE_URL=mongodb://...`)
  doesn't change between local dev and this deployment.
- A free-tier **AKS** cluster (control plane) in the same resource group, to
  run the app workloads against it.

## What gets created

- A resource group
- One `azurerm_mongo_cluster` with `compute_tier = "Free"`:
  - 32 GB storage, single shard, no high availability — fixed by the free tier
  - Free for the lifetime of the account
  - **Only one free-tier cluster is allowed per Azure subscription**
  - Firewall rules controlling public network access (see below)
- One `azurerm_kubernetes_cluster` with `sku_tier = "Free"`:
  - No cost for the control plane, but **no uptime SLA**
  - A single small node pool (`Standard_B2s` by default) — node VMs still
    bill as normal compute, the free tier only covers the control plane
  - System-assigned managed identity
  - Optional API server IP allow-list (open to any IP by default, same as
    stock AKS)

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

4. **Resource provider registration (one-time account prerequisite).** The
   azurerm provider registers zero resource providers by default, and this
   config deliberately doesn't ask it to either — resource provider
   registration is subscription-wide state, not something tied to any
   resource group this config creates/destroys, so it doesn't belong in the
   apply loop. Register the ones this config needs once, sequentially, before
   your first `terraform apply` (registering several for the first time
   concurrently can trip Azure's `RegisterProviderFailed: ... conflicting
   concurrent write`, which `--wait` avoids by finishing one before starting
   the next):
   ```bash
   az provider register --namespace Microsoft.DocumentDB --wait
   az provider register --namespace Microsoft.ContainerService --wait
   az provider register --namespace Microsoft.Network --wait
   ```
   Verify with:
   ```bash
   az provider show --namespace Microsoft.DocumentDB --query registrationState
   az provider show --namespace Microsoft.ContainerService --query registrationState
   az provider show --namespace Microsoft.Network --query registrationState
   ```
   Run this with an account that has `register/action` on the subscription
   (e.g. `Owner`/`Contributor`) — it doesn't need to be the service principal
   from step 1, since it's a one-off setup step, not something Terraform runs.

## Usage

```bash
cd iac
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars as needed

terraform init
terraform plan
terraform apply
```

Retrieve credentials/config after apply:

```bash
terraform output administrator_username
terraform output -raw administrator_password
terraform output -raw mongo_connection_string

terraform output -raw aks_kube_config > kubeconfig.yaml
KUBECONFIG=kubeconfig.yaml kubectl get nodes
```

## Network access

**Mongo cluster:** by default `allow_azure_services = true` adds a firewall
rule for Azure datacenter IP ranges — this already covers the search-engine
app running on the AKS cluster below, since AKS nodes are themselves
Azure-hosted VMs (Microsoft's docs note this rule's scope is "any Azure
service," including other customers' resources — broader than just this
cluster, but far narrower than the internet). To reach the Mongo cluster
directly from your workstation (e.g. for `mongosh`), add your public IP to
`allowed_ip_ranges` in `terraform.tfvars`. Avoid setting `allow_all_ips = true`
unless you understand the exposure — the cluster still requires
authentication, but it opens the endpoint to the whole internet.

**AKS API server:** open to any IP by default (stock AKS behavior). Restrict
it by setting `aks_api_server_authorized_ip_ranges` in `terraform.tfvars`
(include your workstation's IP in CIDR form, e.g. `"203.0.113.10/32"`) —
`kubectl` still needs a valid kubeconfig/token either way.

## Notes

- `location` defaults to `westeurope`; free-tier availability for both the
  Mongo cluster and AKS varies by region — check Azure docs if you change it.
- Destroying and recreating the Mongo cluster does not free up your
  subscription's free-tier slot instantly — deletion must fully complete first.
- AKS's free tier (`sku_tier = "Free"`) only removes the control-plane cost
  and SLA — node VMs (`aks_node_vm_size`, default `Standard_B2s`) bill as
  normal compute. Scale `aks_node_count` down to 0 or destroy the cluster
  when not in use to avoid running costs.
