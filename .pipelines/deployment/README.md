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

4. **DNS.** The only public hostname now is the search-engine app,
   `fide.rrahajason.space` (Meilisearch is cluster-internal — see below).
   Add an `A` record for it in your DNS provider (Vercel, for
   `rrahajason.space`) pointing at the ingress controller's external IP from
   step 1. Let's Encrypt's HTTP-01 challenge (used by the ClusterIssuer above)
   requires this to resolve correctly *before* an Ingress referencing it is
   applied, or issuance will fail/retry.

## Deploying Meilisearch

Meilisearch is **cluster-internal only** — no Ingress, no public hostname, no
TLS. It's reachable from other pods (the search-engine app below) at
`http://meilisearch-service:7700`, and from nothing outside the cluster. This
also means its Cosmos DB access no longer needs a public-internet-facing
firewall rule (see `../../iac/README.md`'s Network access section) — only
the search-engine app talks to it externally, and it's Azure-hosted (AKS)
itself.

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
   ```

If you're migrating an existing cluster that previously had Meilisearch
exposed at `meili.rrahajason.space`, remove the old ingress and DNS record:
```bash
kubectl delete ingress meilisearch-ingress --ignore-not-found
```
(deleting the Ingress cascade-deletes its cert-manager `Certificate` and TLS
`Secret` too, via owner references) — then remove the now-dangling `meili`
`A` record from your DNS provider.

### Rotating the master key

```bash
kubectl create secret generic meilisearch-secret \
  --from-literal=MEILI_MASTER_KEY='<new-key>' \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl rollout restart deployment/meilisearch
kubectl rollout restart deployment/search-engine
```

## Deploying search-engine

The app (image `ghcr.io/gasystarttask/bible-chat-scholar`, built by
`.github/workflows/search-engine-docker.yml`) runs in the same cluster as
Meilisearch and reaches it over the internal ClusterIP Service — no public
Meilisearch exposure and no Cosmos DB IP-allowlisting problem, unlike the
earlier Vercel-based setup (Vercel's serverless functions have no fixed
outbound IP to allowlist, which is exactly what forced `allow_all_ips = true`
on the Mongo cluster before; running on AKS avoids that entirely).

1. Create the runtime Secret (values from `search-engine/env.example`; get
   `DATABASE_URL` via `terraform output -raw mongo_connection_string` in
   `iac/`). `MEILISEARCH_API_KEY` is deliberately **not** included here — the
   Deployment reads it directly from `meilisearch-secret` instead, so it
   only exists in one place:
   ```bash
   kubectl create secret generic search-engine-secret \
     --from-literal=DATABASE_URL='<mongo connection string>' \
     --from-literal=OPENAI_API_KEY='<key>' \
     --from-literal=GEMINI_API_KEY='<key>' \
     --from-literal=GITHUB_TOKEN='<token>'
   ```
2. Apply the manifests:
   ```bash
   kubectl apply -f search-engine/search-engine-config.yaml
   kubectl apply -f search-engine/search-engine-deployment.yaml
   kubectl apply -f search-engine/search-engine-ingress.yaml
   ```
3. Once DNS has propagated and the cert is issued
   (`kubectl describe certificate search-engine-tls`), the app is live at
   `https://fide.rrahajason.space`.

After this bootstrap, deploys are continuous: every push to `main` that
touches `search-engine/**` builds a new image and runs `kubectl set image`
against this Deployment automatically (see `search-engine-docker.yml`) — you
shouldn't need to `kubectl apply` the Deployment manually again unless you
change the manifest itself (env vars, resources, etc.).

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

The `deploy` job in `search-engine-docker.yml` (continuous deployment for
the search-engine app) reuses this exact same app/federated credential and
the same five repository variables — `Azure Kubernetes Service Contributor
Role`'s wildcard `Microsoft.ContainerService/managedClusters/*` permissions
already include fetching cluster credentials (`listClusterUserCredential`),
so no separate Azure setup is needed for it.
