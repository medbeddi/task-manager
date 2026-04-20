# Guide pas à pas — Task Manager

Ce document décrit **chaque étape** pour faire tourner le projet, du plus simple (Docker) au déploiement Kubernetes.

---

## Avant toute chose : ce dont tu as besoin

| Outil | Pour quoi |
|--------|-----------|
| **Git** | Cloner / versionner le projet |
| **Docker Desktop** (Windows) | Option la plus simple : tout lancer avec `docker compose` |
| **OU** JDK 17 + Maven + Node.js 20 + npm | Développement sans Docker |
| **PostgreSQL 16** (si pas Docker) | Base de données sur le port **5432** |
| Compte **GitHub** | CI/CD et images Docker (optionnel) |
| **kubectl** + un cluster Kubernetes | Déploiement K8s (optionnel) |

Le projet est supposé être dans un dossier du type :  
`C:\Users\<toi>\Projects\task-manager`  
(adapte le chemin si besoin.)

---

# Partie 1 — Lancer l’application avec Docker (recommandé)

C’est la méthode la plus courte : PostgreSQL + backend + frontend tournent dans des conteneurs.

## Étape 1.1 — Installer Docker Desktop

1. Télécharge **Docker Desktop pour Windows** sur le site officiel Docker.
2. Installe-le et **redémarre** si demandé.
3. Ouvre Docker Desktop et attends que l’état soit **Running** (moteur démarré).

## Étape 1.2 — Ouvrir un terminal dans le projet

1. Ouvre **PowerShell** ou **Terminal** dans Cursor.
2. Va à la racine du projet (là où se trouve `docker-compose.yml`) :

```powershell
cd C:\Users\beddi\Projects\task-manager
```

(Remplace par ton vrai chemin si différent.)

## Étape 1.3 — Construire et démarrer les services

Exécute :

```powershell
docker compose up --build
```

- La **première fois**, le build peut prendre plusieurs minutes (téléchargement des images, compilation Maven, build Angular).
- Tu dois voir des logs pour **postgres**, **backend**, **frontend**.

## Étape 1.4 — Vérifier que tout répond

1. Ouvre un navigateur : **http://localhost:4200**
2. Tu dois voir l’interface Task Manager.
3. Clique sur **Register**, crée un compte, puis connecte-toi et crée une tâche.

## Étape 1.5 — Arrêter les conteneurs

Dans le terminal où `docker compose` tourne : **Ctrl+C**.

Pour supprimer aussi les conteneurs du compose :

```powershell
docker compose down
```

(Les données PostgreSQL restent dans le volume `postgres_data` tant que tu ne fais pas `docker compose down -v`.)

---

# Partie 2 — Développement local (sans Docker pour le code)

Tu lances **PostgreSQL** toi-même (ou un seul conteneur Postgres), puis le backend et le frontend sur la machine.

## Étape 2.1 — Installer PostgreSQL

1. Installe **PostgreSQL** (version 15 ou 16 par exemple) pour Windows.
2. Pendant l’installation, note le **mot de passe** du superutilisateur `postgres` (tu peux t’en servir pour l’admin).

## Étape 2.2 — Créer l’utilisateur et la base (comme dans le projet)

Ouvre **pgAdmin** ou **psql** et exécute :

```sql
CREATE USER taskmanager WITH PASSWORD 'taskmanager';
CREATE DATABASE taskmanager OWNER taskmanager;
```

Si tu préfères un autre mot de passe, mets le **même** dans  
`backend/src/main/resources/application.properties` :

```properties
spring.datasource.password=ton_mot_de_passe
```

## Étape 2.3 — Installer JDK 17 et Maven

1. Installe **Temurin 17** (ou un autre JDK 17).
2. Installe **Maven** et vérifie dans un **nouveau** terminal :

```powershell
java -version
mvn -version
```

Les deux commandes doivent fonctionner sans erreur.

## Étape 2.4 — Démarrer le backend

```powershell
cd C:\Users\beddi\Projects\task-manager\backend
mvn spring-boot:run
```

- Attends le message du type **Started TaskManagerApplication**.
- L’API écoute sur **http://localhost:8080**.

## Étape 2.5 — Démarrer le frontend (autre terminal)

```powershell
cd C:\Users\beddi\Projects\task-manager\frontend
npm install
npx ng serve
```

- Ouvre **http://localhost:4200**.
- Le fichier `src/environments/environment.ts` pointe l’API vers **http://localhost:8080** : pas besoin de proxy pour le dev.

## Étape 2.6 — Tester

Même chose qu’en Docker : inscription, login, tâches.

---

# Partie 3 — Mettre le projet sur GitHub et activer le CI/CD

## Étape 3.1 — Créer un dépôt sur GitHub

1. Va sur GitHub → **New repository**.
2. Donne un nom (ex. `task-manager`), crée le dépôt **sans** README si tu pousses un projet existant.

## Étape 3.2 — Pousser ton code (première fois)

Dans la racine du projet :

```powershell
cd C:\Users\beddi\Projects\task-manager
git init
git add .
git commit -m "Initial commit: Task Manager"
git branch -M main
git remote add origin https://github.com/TON_USER/task-manager.git
git push -u origin main
```

(Remplace l’URL par celle de **ton** dépôt.)

## Étape 3.3 — Ce que fait le CI automatiquement

Le fichier `.github/workflows/ci-cd.yml` :

- Sur **chaque pull request** ou **push** vers `main` : build Maven + build Angular.
- Sur **push sur `main`** uniquement : en plus, construction et envoi des images Docker sur **GitHub Container Registry (GHCR)** :
  - `ghcr.io/<ton-org-en-minuscules>/task-manager-backend`
  - `ghcr.io/<ton-org-en-minuscules>/task-manager-frontend`

## Étape 3.4 — Vérifier le workflow

1. Sur GitHub : onglet **Actions**.
2. Clique sur le dernier workflow : il doit être **vert** si tout est OK.

---

# Partie 4 — Déployer sur Kubernetes (cluster)

Tu as besoin d’un cluster (kind, minikube, EKS, GKE, AKS, etc.) et de **kubectl** configuré.

## Étape 4.1 — Installer les composants du cluster

1. **Ingress Controller** (ex. [ingress-nginx](https://kubernetes.github.io/ingress-nginx/deploy/)) — pour exposer l’app avec un nom de domaine (ou IP + host).
2. Si tu utilises le **HPA** (autoscaling du backend) : installer **metrics-server**.

## Étape 4.2 — Créer le namespace et le secret

```powershell
kubectl create namespace task-manager
```

Crée le secret (remplace les valeurs par les tiennes, **fortes** en production) :

```powershell
kubectl create secret generic task-manager-secrets `
  --namespace=task-manager `
  --from-literal=postgres-password='MOT_DE_PASSE_POSTGRES' `
  --from-literal=jwt-secret='CLE_JWT_TRES_LONGUE_MINIMUM_32_CARACTERES'
```

- L’utilisateur PostgreSQL dans le cluster est **`taskmanager`**, la base **`taskmanager`** (déjà défini dans les YAML).
- Le mot de passe du secret doit être celui que tu veux pour cet utilisateur.

## Étape 4.3 — Pointer les images vers ton GHCR

1. Ouvre `k8s/kustomization.yaml`.
2. Dans la section `images`, remplace `ghcr.io/example/...` par ton compte GitHub **en minuscules**, ou exécute :

```powershell
cd C:\Users\beddi\Projects\task-manager\k8s
kustomize edit set image task-manager-backend=ghcr.io/ton-org/task-manager-backend:latest
kustomize edit set image task-manager-frontend=ghcr.io/ton-org/task-manager-frontend:latest
```

(Si `kustomize` n’est pas installé, édite à la main la section `images:` dans `kustomization.yaml`.)

Assure-toi d’avoir **poussé** les images (étape 3) pour que le cluster puisse les tirer.

## Étape 4.4 — Configurer l’Ingress

1. Ouvre `k8s/ingress.yaml`.
2. Remplace `task-manager.example.com` par **ton domaine** (ou utilise une IP + fichier hosts pour les tests).
3. Ajoute la section `tls` si tu as un certificat (ex. cert-manager).

## Étape 4.5 — Appliquer les manifests

```powershell
cd C:\Users\beddi\Projects\task-manager
kubectl apply -k k8s/
```

## Étape 4.6 — Vérifier

```powershell
kubectl get pods -n task-manager
kubectl get svc,ingress -n task-manager
```

Tous les pods doivent passer **Running** / **Ready**. Ensuite ouvre l’URL de ton Ingress dans le navigateur.

---

# Ordre conseillé si tu débutes

1. **Partie 1 (Docker)** jusqu’à ce que l’app marche sur localhost:4200.  
2. **Partie 2** seulement si tu veux coder avec rechargement rapide sans tout Docker.  
3. **Partie 3** quand tu veux sauvegarder le code et avoir des builds automatiques.  
4. **Partie 4** quand tu as un vrai cluster et un domaine (ou un environnement de test K8s).

Pour plus de détails sur l’architecture K8s et le CI :  
`docs/DEPLOIEMENT-KUBERNETES.md`.
