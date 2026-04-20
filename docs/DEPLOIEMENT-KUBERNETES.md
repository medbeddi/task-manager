# CI/CD et déploiement Kubernetes (Task Manager)

Ce document décrit l’architecture, le pipeline CI/CD et le déploiement sur Kubernetes.

## Architecture cible

```text
                    Internet
                        │
                        ▼
              ┌─────────────────┐
              │ Ingress (nginx) │  host: votre-domaine
              └────────┬────────┘
                       │ HTTP /
                       ▼
              ┌─────────────────┐
              │ Service         │
              │  frontend:80    │
              └────────┬────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           │
  ┌──────────────┐                   │
  │ Deployment   │  nginx :          │
  │  frontend    │  SPA + proxy      │
  │  (2 pods)    │  /api → backend   │
  └──────┬───────┘                   │
         │ proxy /api                │
         ▼                           │
  ┌──────────────┐                   │
  │ Service      │◄──────────────────┘
  │  backend:8080
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐      ┌──────────────┐
  │ Deployment   │      │ StatefulSet  │
  │  backend     │─────►│  PostgreSQL  │
  │  (2–8 pods)  │ JDBC │  (1 pod)     │
  └──────────────┘      └─────┬────────┘
                              │
                        PVC persistant

  HPA : scale le backend sur l’utilisation CPU (metrics-server requis)
```

- **Frontend** : build Angular en `apiUrl: ''` ; le navigateur appelle `/api/...` sur le même domaine ; **nginx** dans l’image frontend fait le `proxy_pass` vers le service `backend`.
- **Backend** : Spring Boot, JWT, Actuator (`/actuator/health/*`) pour les sondes Kubernetes.
- **PostgreSQL** : StatefulSet + volume persistant **dans le cluster** — adapté à la démo ; en **production**, préférez souvent une base managée (RDS PostgreSQL, Cloud SQL, Azure Database for PostgreSQL, etc.) et pointez le backend vers son URL JDBC au lieu du StatefulSet.

## CI/CD (GitHub Actions)

Fichier : [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml).

| Déclencheur | Comportement |
|-------------|----------------|
| **Pull request** sur `main` | Build Maven (backend) + `ng build` (frontend), **sans** push d’images. |
| **Push** sur `main` | Idem + construction et publication des images Docker sur **GHCR** : `ghcr.io/<owner-minuscule>/task-manager-backend` et `task-manager-frontend`, tags `latest` et `<commit-sha>`. |

### Prérequis GitHub

- Le dépôt sur GitHub (workflow utilise `GITHUB_TOKEN` pour pousser vers GHCR).
- Packages publics ou configuration des droits d’accès aux packages.

### Images privées

Sur le cluster, créez un pull secret :

```bash
kubectl create secret docker-registry ghcr-pull \
  --namespace task-manager \
  --docker-server=ghcr.io \
  --docker-username=VOTRE_USER \
  --docker-password=ghp_xxx
```

Puis ajoutez `imagePullSecrets: [{ name: ghcr-pull }]` aux `Deployment` (à faire dans vos overlays ou en patch).

## Déploiement Kubernetes (kubectl + Kustomize)

### 1. Outils cluster

- [Ingress NGINX](https://kubernetes.github.io/ingress-nginx/deploy/) (ou autre contrôleur compatible).
- [metrics-server](https://github.com/kubernetes-sigs/metrics-server) si vous utilisez le **HPA** (`kubectl top nodes` doit fonctionner).

### 2. Secret applicatif (obligatoire)

Le manifeste attend un secret nommé **`task-manager-secrets`** dans le namespace `task-manager` :

```bash
kubectl create namespace task-manager

kubectl create secret generic task-manager-secrets \
  --namespace=task-manager \
  --from-literal=postgres-password='MOT_DE_PASSE_POSTGRES_FORT' \
  --from-literal=jwt-secret='CLE_JWT_TRES_LONGUE_MIN_32_OCTETS_POUR_HS256'
```

Le mot de passe doit correspondre à l’utilisateur **`taskmanager`** (défini dans le StatefulSet). La base créée est **`taskmanager`**.

Ne commitez **jamais** ce secret dans Git. En entreprise : Sealed Secrets, External Secrets, Vault, etc.

### 3. Images Docker

Éditez `k8s/kustomization.yaml` (section `images`) pour pointer vers **votre** registre, ou en ligne de commande :

```bash
cd k8s
kustomize edit set image \
  task-manager-backend=ghcr.io/mon-org/task-manager-backend:main-abc1234 \
  task-manager-frontend=ghcr.io/mon-org/task-manager-frontend:main-abc1234
```

### 4. Ingress

Éditez `k8s/ingress.yaml` : remplacez `task-manager.example.com` par votre domaine ; ajoutez la section `tls` si vous utilisez HTTPS (ex. cert-manager).

### 5. Appliquer

```bash
kubectl apply -k k8s/
```

Vérifiez :

```bash
kubectl get pods,svc,ingress -n task-manager
kubectl logs -n task-manager deploy/backend -f
```

## Chaîne CD avancée (optionnel)

- **Argo CD** / **Flux** : pointer vers ce dossier `k8s/` (ou un repo dédié “gitops”) et synchroniser après chaque merge sur `main`.
- **Déploiement depuis GitHub** : job supplémentaire qui utilise un `KUBECONFIG` encodé en base64 dans un secret GitHub, puis `kubectl apply -k k8s/` — à sécuriser fortement (environnements séparés, revue des manifests).

## Fichiers ajoutés / modifiés côté appli

- **Actuator** (backend) : sondes `/actuator/health/liveness` et `readiness`.
- **`environment.prod.ts`** : `apiUrl: ''` + **nginx** qui proxifie `/api/` vers `backend:8080` (Docker Compose et image frontend K8s identiques).
- **Docker Compose** : `4200:80` (nginx écoute sur le port 80 dans le conteneur).

## Développement local (`ng serve`)

`environment.ts` pointe toujours vers `http://localhost:8080` ; le backend doit être lancé séparément (ou via Docker Compose sur le port 8080). Aucun changement obligatoire pour le flux dev habituel.
