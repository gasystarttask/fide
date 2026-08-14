# Kubernetes deployment

Manifests applied against the AKS cluster provisioned in `../../iac/` — a
plain, ordered set of YAML files (no Helm/Kustomize for the app manifests
themselves).

## Automated deployment

`.github/workflows/deploy-infra.yml` runs every step below **in the same
order**, automatically, on every push to `main` touching
`.pipelines/deployment/**` (or manually via `workflow_dispatch`). It's
idempotent — safe to re-run any time, including on a totally fresh cluster.
The rest of this document describes what it does and how to run those same
steps by hand (useful for a first bootstrap, or if you need to debug a step
in isolation).

**One thing it does *not* automate: DNS.** Pointing `fide.rrahajason.space`
at the ingress controller's IP is a manual, one-off step (see below) — it
only needs doing once per IP, and there's no DNS API credential wired into
CI for it.

It needs these repository **secrets** (Settings → Secrets and variables →
Actions → Secrets — these genuinely are sensitive, unlike the `AKS_*`/
`AZURE_*` **variables** used for OIDC, which are documented further down):

| Secret | Used for |
|---|---|
| `MEILISEARCH_MASTER_KEY` | `meilisearch-secret` — pick a fresh value, e.g. `openssl rand -hex 32` |
| `MONGO_DATABASE_URL` | `search-engine-secret`'s `DATABASE_URL` — `terraform output -raw mongo_connection_string` in `iac/` |
| `OPENAI_API_KEY` | `search-engine-secret` |
| `GEMINI_API_KEY` | `search-engine-secret` |
| `APP_GITHUB_TOKEN` | `search-engine-secret`'s `GITHUB_TOKEN` (named `APP_*` to avoid colliding with the `GITHUB_TOKEN` GitHub injects automatically into every workflow run) |
| `KEYCLOAK_DB_PASSWORD` | `keycloak-db-secret` — pick a fresh value, e.g. `openssl rand -hex 32` |
| `KEYCLOAK_ADMIN_PASSWORD` | `keycloak-secret`'s bootstrap admin password — strong, unique value |
| `AUTH_SECRET` | `search-engine-secret` — next-auth's session-signing secret, e.g. `openssl rand -base64 32` |
| `KEYCLOAK_CLIENT_SECRET` | `search-engine-secret` — the `search-engine` OIDC client's secret, from Keycloak's Admin Console once the realm/client exist |

Since the workflow re-applies these secrets from CI on every run, they
become the source of truth going forward — changing a value here and
re-running the workflow (or pushing any change under
`.pipelines/deployment/**`) rotates it live, including a rollout restart of
the affected Deployment so it actually picks up the new value.

## Azure AKS Shortcut: 
If your new cluster is hosted on Azure AKS and you haven't imported it to your machine yet, run this Azure CLI command to pull the context automatically and switch to it:
```bash
az aks get-credentials --resource-group <MY_RESOURCE_GROUP> --name <MY_CLUSTER_NAME>
```
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
     --namespace cert-manager --create-namespace --set crds.enabled=true \
     --force-conflicts
   ```
   `--force-conflicts` works around a known AKS quirk: its built-in
   "admissionsenforcer" continuously patches every webhook config's
   `namespaceSelector` to exclude AKS-internal namespaces, which conflicts
   with Helm's server-side-apply field ownership on that same field (Helm 4
   defaults to SSA; the old `--force`/`--force-replace` is incompatible with
   it — see [Azure/AKS#4002](https://github.com/Azure/AKS/issues/4002)).
   `--force-conflicts` lets Helm's apply win the conflict; AKS just
   re-patches the selector back in right after, which is expected.

3. **ClusterIssuer** (this repo's `cluster/letsencrypt-cluster-issuer.yaml`):
   ```bash
   kubectl apply -f cluster/letsencrypt-cluster-issuer.yaml
   ```

4. **DNS.** The public hostnames are the search-engine app,
   `fide.rrahajason.space`, and the Keycloak identity provider,
   `auth.rrahajason.space` (Meilisearch and Keycloak's Postgres are
   cluster-internal — see below). Add an `A` record for each in your DNS
   provider (Vercel, for `rrahajason.space`) pointing at the ingress
   controller's external IP from step 1. Let's Encrypt's HTTP-01 challenge
   (used by the ClusterIssuer above) requires this to resolve correctly
   *before* an Ingress referencing it is applied, or issuance will
   fail/retry.

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
3. Initialize the indexes. Since Meilisearch has no public endpoint,
   `services/scripts/init-meilisearch.sh` (the same script the local
   `meilisearch-init` Compose service runs) needs to run *from inside* the
   cluster instead of against `localhost` — `meilisearch-init-job.yaml` runs
   it as a one-off Job against `http://meilisearch-service:7700`:
   ```bash
   kubectl create configmap meilisearch-init-script \
     --from-file=init-meilisearch.sh=../../services/scripts/init-meilisearch.sh
   kubectl apply -f meilisearch/meilisearch-init-job.yaml
   kubectl wait --for=condition=complete job/meilisearch-init --timeout=120s
   kubectl logs job/meilisearch-init
   ```
   To re-run after editing the script (e.g. adding an index), delete the Job
   and the ConfigMap first — `kubectl apply` can't update either in place
   since Job specs are immutable after creation:
   ```bash
   kubectl delete job meilisearch-init --ignore-not-found
   kubectl delete configmap meilisearch-init-script --ignore-not-found
   # then re-run the create/apply/wait steps above
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

## Deploying Keycloak

Keycloak is the self-hosted SSO identity provider for search-engine (issue
#127), backed by its own Postgres pod + PVC — **not** the embedded dev-mode
store, since `aks-stop-start.yml`'s nightly stop/start recreates pods on
every restart and would wipe realms/users/clients otherwise. Unlike
Meilisearch, it needs a public Ingress (`auth.rrahajason.space`) since
browsers must reach it directly during login.

1. Create the secrets (never commit real values):
   ```bash
   kubectl create secret generic keycloak-db-secret \
     --from-literal=POSTGRES_PASSWORD='<your-generated-password>'
   kubectl create secret generic keycloak-secret \
     --from-literal=KC_BOOTSTRAP_ADMIN_PASSWORD='<your-generated-password>'
   ```
2. Apply the manifests:
   ```bash
   kubectl apply -f keycloak/keycloak-db-storage.yml
   kubectl apply -f keycloak/keycloak-db-deployment.yaml
   kubectl apply -f keycloak/keycloak-deployment.yaml
   kubectl apply -f keycloak/keycloak-ingress.yaml
   ```
3. Once DNS has propagated and the cert is issued
   (`kubectl describe certificate keycloak-tls`), the admin console is at
   `https://auth.rrahajason.space/admin`, username `kcadmin`.
4. **Immediately after first login:** create a dedicated, permanent realm
   admin user and disable the temporary `kcadmin` bootstrap account —
   `KC_BOOTSTRAP_ADMIN_*` is meant to be provisional. From that point on,
   rotate the admin password via the Admin Console/`kcadm.sh`, **not** by
   changing the `KEYCLOAK_ADMIN_PASSWORD` GitHub secret — unlike
   Meilisearch's master key, the bootstrap env var only takes effect once,
   against an empty admin table, and re-running this workflow after that has
   no effect.
5. Create the realm and OIDC client that `search-engine` will authenticate
   against (realm e.g. `bible-sg`, confidential client, redirect URIs for
   `https://fide.rrahajason.space/*` and, for local development,
   `http://localhost:3000/*`).
6. Once a `kc-theme-v*` release exists (see `../../kc-themes/README.md`), set
   the realm's login theme to `fide-kc-themes` in the Admin Console (Realm
   Settings → Themes → Login theme). This is a one-time, per-realm manual
   step — the Deployment's `pull-theme` initContainer only fetches the jar
   itself; nothing auto-assigns it.

### Custom login theme

`keycloak-deployment.yaml`'s `pull-theme` initContainer downloads
`keycloak-theme.jar` (built from `../../kc-themes/`) from the floating
`kc-theme-latest` release tag — **not** GitHub's generic `/releases/latest/`,
which is repo-wide and would get hijacked by this repo's own app
`release.yml` — into a volume mounted at `/opt/keycloak/providers` on the
main container. Since Keycloak runs `start` (non-optimized, see above), it
rebuilds providers from that directory on every boot — including on the
nightly stop/start pod recreation — so the theme jar refreshes to whatever
`kc-theme-release.yml` last published, on every restart, automatically. If
no release exists yet, or the fetch fails for any reason, the initContainer
logs a message and exits `0` rather than failing, so a theme problem never
blocks Keycloak itself from starting. See `../../kc-themes/README.md` for
the accepted risk this trades off (no version pinning/rollback).

### Cost delta

$0 managed-service cost — Postgres and Keycloak both run self-hosted in the
existing cluster rather than as managed Azure services. The only recurring
additions are the 5Gi `managed-csi` PVC (a few cents/month) and, if the node
was resized (see `../../iac/README.md`), the marginal VM cost — capped by
the existing stop/start automation to the same ~70 running hours/week as
everything else on the cluster.

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
stops the cluster nightly (19:00 UTC, every day) and starts it weekdays
(17:00 UTC, Mon-Fri), so it stays fully stopped over the weekend.
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
