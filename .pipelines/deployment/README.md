# Kubernetes deployment

Manifests deployed by hand via `kubectl apply` against the AKS cluster
provisioned in `../../iac/`. No Helm/Kustomize/CI pipeline yet — this is a
plain, ordered set of YAML files.

## One-time cluster bootstrap

Needed once per cluster, before deploying any app manifests. Requires
`kubectl` pointed at the cluster (`terraform output -raw aks_kube_config` in
`iac/`) and `helm`.

1. **ingress-nginx** — terminates HTTP(S) traffic and routes it to in-cluster
   Services by hostname:
   ```bash
   helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
   helm repo update
   helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
     --namespace ingress-nginx --create-namespace \
     --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz
   ```
   The `/healthz` annotation is required on AKS: Azure's Load Balancer health
   probe defaults to `GET /` on the controller's data port, which hits
   ingress-nginx's default backend and returns `404` (since nothing matches
   an empty `Host`) — Azure treats that as unhealthy and silently drops all
   inbound traffic to the LB's public IP (looks like a generic connection
   timeout from outside, NSG rules included, with no error on the Kubernetes
   side at all). `/healthz` is served with `200` regardless of `Host`, which
   fixes it.

   This provisions a new Azure public IP for the ingress controller. Get it:
   ```bash
   kubectl get service ingress-nginx-controller -n ingress-nginx --watch
   ```

2. **cert-manager** — automates TLS certificate issuance/renewal via Let's Encrypt:
   ```bash
   helm repo add jetstack https://charts.jetstack.io
   helm repo update
   helm upgrade --install cert-manager jetstack/cert-manager \
     --namespace cert-manager --create-namespace --set crds.enabled=true
   ```

3. **ClusterIssuer** (this repo's `cluster/letsencrypt-cluster-issuer.yaml`):
   ```bash
   kubectl apply -f cluster/letsencrypt-cluster-issuer.yaml
   ```

4. **DNS.** For each hostname used by an Ingress (e.g. `meili.rrahajason.space`),
   add an `A` record in your DNS provider (Vercel, for `rrahajason.space`)
   pointing at the ingress controller's external IP from step 1. Let's
   Encrypt's HTTP-01 challenge (used by the ClusterIssuer above) requires this
   to resolve correctly *before* an Ingress referencing it is applied, or
   issuance will fail/retry.

## Deploying Meilisearch

1. Create the master-key Secret (never commit the real value — generate a
   fresh one, e.g. `openssl rand -hex 32`):
   ```bash
   kubectl create secret generic meilisearch-secret \
     --from-literal=MEILI_MASTER_KEY='<your-generated-key>'
   ```
2. Apply the manifests:
   ```bash
   kubectl apply -f meilisearch/meili-storage.yml
   kubectl apply -f meilisearch/meilisearch-deployment.yaml
   kubectl apply -f meilisearch/meilisearch-ingress.yaml
   ```
3. Once DNS has propagated and the ClusterIssuer has issued the cert
   (`kubectl describe certificate meilisearch-tls` to check progress), the
   service is reachable at `https://meili.rrahajason.space`.

### Rotating the master key

```bash
kubectl create secret generic meilisearch-secret \
  --from-literal=MEILI_MASTER_KEY='<new-key>' \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl rollout restart deployment/meilisearch
```

## Cost control: AKS stop/start automation

The node VM and its Load Balancer/Public IP are the real recurring costs in
this setup (the AKS control plane and Cosmos DB free tiers are genuinely
$0 — see `../../iac/README.md`). `.github/workflows/aks-stop-start.yml`
stops the cluster nightly (19:00 UTC, every day) and starts it weekday
mornings (06:00 UTC, Mon-Fri), so it stays fully stopped over the weekend.
Times are UTC and don't shift with daylight saving — adjust the two `cron`
expressions in the workflow if you want to compensate.

`workflow_dispatch` also lets you trigger an immediate stop/start manually
from the Actions tab, picking `action: stop` or `action: start`.

### One-time setup

This workflow authenticates via OIDC with its own Entra ID app, scoped
*only* to starting/stopping this one AKS cluster — deliberately not reusing
the broader `Contributor`-scoped app created for HCP Terraform in
`iac/README.md`, since this credential lives in a less-trusted place (a
scheduled CI job) and doesn't need anywhere near that level of access.

1. **Create the app + service principal:**
   ```bash
   az ad app create --display-name fide-aks-stopstart-github
   # note the appId (client_id) from the output
   az ad sp create-for-rbac --name fide-aks-stopstart-github --skip-assignment
   ```

2. **Scope a narrow role assignment** to just this cluster (not the whole
   subscription/resource group):
   ```bash
   AKS_ID=$(az aks show --resource-group rg-fide-docdb-free --name <aks-cluster-name> --query id -o tsv)
   az role assignment create \
     --assignee <app-client-id> \
     --role "Azure Kubernetes Service Contributor Role" \
     --scope "$AKS_ID"
   ```

3. **Add a federated credential** on the app (Entra ID portal → App
   registrations → your app → Certificates & secrets → Federated credentials
   → scenario "GitHub Actions deploying Azure resources", or "Other issuer"
   with these values):
   - Issuer: `https://token.actions.githubusercontent.com`
   - Subject: `repo:gasystarttask/fide:ref:refs/heads/main` (scheduled
     workflows run against the default branch)
   - Audience: default (`api://AzureADTokenExchange`)

4. **Set these as repository variables** (Settings → Secrets and variables →
   Actions → Variables — not Secrets, none of these are sensitive since auth
   is via OIDC, not a stored key):
   | Variable | Value |
   |---|---|
   | `AKS_AUTOMATION_CLIENT_ID` | the app's client ID from step 1 |
   | `AZURE_TENANT_ID` | your Entra ID tenant ID |
   | `AZURE_SUBSCRIPTION_ID` | your subscription ID |
   | `AKS_RESOURCE_GROUP` | `rg-fide-docdb-free` |
   | `AKS_CLUSTER_NAME` | the AKS cluster name (`terraform output aks_cluster_name` in `iac/`) |

Once set, the workflow runs on its schedule with no further action needed.
Note that Meilisearch (and anything else on the cluster) is unreachable
while stopped — `kubectl` commands against a stopped cluster's API server
will time out until the next `start`.
