# RecruiteMee CI/CD (Docker Compose + EC2)

This project now uses GitHub Actions to:
1. Build Docker images with `docker compose`
2. Start the stack and run smoke tests automatically
3. Deploy to EC2 on `main/master` pushes

Workflow file:
- `.github/workflows/deploy.yml`

Compose file:
- `docker-compose.yml`

---

## 1) CI Behavior (Automatic)

On every `pull_request` and `push` to `main/master`, GitHub Actions will:
1. Run `docker compose build --pull`
2. Run `docker compose up -d --wait --wait-timeout 180`
3. Smoke test backend: `GET http://localhost:5000/health`
4. Smoke test frontend: `GET http://localhost:8080`
5. Always tear down containers with `docker compose down -v --remove-orphans`

This ensures image build + runtime checks are validated before deployment.

---

## 2) CD Behavior (Automatic Deploy to EC2)

On `push` to `main/master`, after CI passes, workflow deploys to EC2 over SSH.

Remote deploy flow:
1. Connect to EC2 using SSH key
2. Ensure `git`, `docker`, and `docker compose` exist
3. Clone repo (first time) or pull latest branch
4. Write `.env` on EC2 from GitHub Secrets
5. Run `docker compose up -d --build --remove-orphans`
6. Verify backend health endpoint

If required secrets are missing, deploy step is skipped.

---

## 3) Required GitHub Secrets

Go to `GitHub Repo -> Settings -> Secrets and variables -> Actions` and set:

Required for deploy:
- `EC2_HOST` (public IP or DNS)
- `EC2_USER` (example: `ubuntu`)
- `EC2_SSH_KEY` (private key content)
- `MONGO_URI` (example: Atlas URI)
- `JWT_SECRET`
- `APP_URL` (frontend public URL)
- `CLIENT_ORIGINS` (comma-separated allowed origins)
- `VITE_API_URL` (public backend API base URL)

Optional:
- `EC2_PORT` (default: `22`)
- `EC2_DEPLOY_PATH` (default: `/opt/recruitemee`)
- `USE_GRIDFS` (`0` or `1`, default: `0`)
- `EC2_REPO_URL` (needed if default repo clone URL is not usable on EC2)
- `MONGO_DNS_SERVERS` (example: `1.1.1.1,8.8.8.8` for Atlas SRV DNS issues)
- `MONGO_URI_FALLBACK` (example: `mongodb://127.0.0.1:27017/recruitemee`)
- `MONGO_SERVER_SELECTION_TIMEOUT_MS` (example: `10000`)
- `BACKEND_HOST_PORT` (default: `5000`; set `5001` locally if `5000` is in use)

Notes for private repositories:
- If EC2 cannot clone the repo anonymously, set `EC2_REPO_URL` to an authenticated URL.
- Example format:
  - `https://x-access-token:<github_pat>@github.com/<owner>/<repo>.git`

---

## 4) EC2 One-Time Setup

Run these once on EC2:

```bash
# Ubuntu example
sudo apt-get update
sudo apt-get install -y ca-certificates curl git

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Verify docker + compose plugin
docker --version
docker compose version
```

Open security group ports as needed:
- `22` (SSH)
- `80`/`443` (frontend, if serving publicly)
- `5000` (backend, if accessed directly)

---

## 5) Local Run (Same Compose Stack)

```bash
# from repo root
export MONGO_URI="mongodb+srv://uppiupendra077_db_user:<db_password>@cluster0.67yblz2.mongodb.net/recruitemee?retryWrites=true&w=majority&appName=Cluster0"
export MONGO_DNS_SERVERS="1.1.1.1,8.8.8.8"
export MONGO_URI_FALLBACK="mongodb://127.0.0.1:27017/recruitemee"
export JWT_SECRET="local-dev-secret"
export APP_URL="http://localhost:8080"
export CLIENT_ORIGINS="http://localhost:8080"
export VITE_API_URL="http://localhost:5000"
export BACKEND_HOST_PORT="5000"

# start local mongo (recommended for dev fallback)
docker compose up -d mongo

# build and start
docker compose up -d --build

# verify
curl -fsS http://localhost:5000/health
curl -fsS http://localhost:8080

# stop
docker compose down -v
```

---

## 6) Service Endpoints

With default compose ports:
- Frontend: `http://localhost:8080`
- Backend: `http://localhost:5000`
- MongoDB: internal container network `mongodb://mongo:27017` (not exposed publicly)

---

## 7) Troubleshooting

If CI fails on compose startup:
1. Check `docker compose logs --tail=200`
2. Confirm backend has valid `MONGO_URI` and `JWT_SECRET`

If EC2 deploy fails:
1. Verify SSH credentials (`EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`)
2. Verify Docker + Compose installed on EC2
3. Verify EC2 can clone repo (set `EC2_REPO_URL` if private)
4. Verify required app secrets are present
