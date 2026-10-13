# LLM MANAGEMENT SYSTEM

A full-stack DBMS mini-project for managing ML projects, datasets, experiments, models, versions, training runs, metrics, checkpoints, evaluations, and deployments. React communicates with FastAPI; FastAPI is the only component that accesses Elasticsearch. The interface includes saved light and dark themes.

## Architecture

```text
React + Vite (localhost:5173)
        │ Axios + JWT
        ▼
FastAPI (localhost:8000)
        │ Elasticsearch Python client
        ▼
Elasticsearch 8.17 (localhost:9200)
  users · projects · datasets · experiments · models · training_runs
```

## Prerequisites

- Python 3.11 or newer
- Node.js 20 or newer and npm
- Docker Desktop or Docker Engine with Compose, with at least about 2 GB of available memory

Run the following commands from the repository root. On Windows, open separate PowerShell terminals for the backend and frontend. `python` can be replaced with `py` if needed.

## 1. Start Elasticsearch

```powershell
docker compose up -d
docker compose ps
```

The first run downloads the Elasticsearch image and can take several minutes. Wait until `http://localhost:9200` responds or `docker compose ps` reports healthy.

## 2. Configure and install the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` and replace `JWT_SECRET` with a long random value. The file is ignored by Git. For example, generate a value with `python -c "import secrets; print(secrets.token_urlsafe(48))"` and paste it into `.env`. `CORS_ORIGINS` defaults to the Vite address.

## 3. Create indices and load demo data

With the backend virtual environment active and the current directory set to `backend`:

```powershell
python create_indices.py
python seed_data.py
```

If you are upgrading a copy that already had data before workspace isolation was added, run `python migrate_workspaces.py` once. It assigns the existing sample records to the demo workspace and preserves records owned by registered users. A fresh installation does not need the migration command.

Both commands are safe to run again. `create_indices.py` keeps existing indices and documents. `seed_data.py` checks its deterministic demo IDs and does not duplicate them. To replace **only the demo documents** with their original values, run `python seed_data.py --reset`.

The seed contains 3 users, 4 projects, 7 datasets, 5 experiments, 5 models, 9 model versions, and 14 training runs.

The three demo accounts share that sample workspace. Every newly registered account starts with an empty, private workspace. Project lists, related records, search, analytics, dashboard counts, and record actions are scoped on the backend to the signed-in workspace. Registration always gives new accounts the Researcher role; users cannot grant themselves Admin access. The demo roles are labels only and do not grant additional permissions.

## 4. Run the backend

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

Check `http://localhost:8000/api/health` and Swagger at `http://localhost:8000/docs`.

## 5. Run the frontend

In a second terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Online demo: Elastic Cloud + Render + Cloudflare Pages

1. Create an **Elastic Cloud Hosted deployment** and save its Cloud ID and the generated password for the `elastic` user. The trial is temporary.
2. Push this repository to GitHub. On Render, select **New > Blueprint**, connect the repository, and choose `main`. Render reads `render.yaml` to create the free FastAPI service. Enter `ELASTIC_CLOUD_ID` and `ELASTIC_PASSWORD` when prompted. Never commit these values to GitHub.
3. Wait for the Render deployment to finish. Open `https://YOUR-SERVICE.onrender.com/api/health` and confirm `elasticsearch` is `connected`.
4. In Cloudflare Pages, open the frontend project's **Settings > Variables and secrets**. Set `VITE_API_URL` to `https://YOUR-SERVICE.onrender.com/api`, then redeploy the frontend. The `/api` suffix is required.

The Render startup command creates the six indices and adds demo data only if it is missing. New accounts still start empty. The production backend uses Elastic Cloud; your local Docker data is separate. After the Elastic trial ends, the hosted database stops unless you arrange a paid plan or migrate the data.

The configured addresses are:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8000 |
| FastAPI Swagger | http://localhost:8000/docs |
| Elasticsearch | http://localhost:9200 |

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Researcher | researcher@demo.com | demo123 |
| Admin | admin@demo.com | admin123 |
| Developer | developer@demo.com | demo123 |

The seed script hashes these passwords with bcrypt before saving them. API responses never include password hashes. The passwords are intended for a local academic demo only.

## Demo walkthrough

1. Log in as `researcher@demo.com`.
2. View the populated dashboard and live run counts.
3. Open **Vehicle Detection**. It contains **VehicleData**, **RoadImages**, **YOLO Testing**, and related runs.
4. Open **Models**, inspect **YOLOv8** versions 1.0 and 1.1.
5. Open **Training Runs** → **YOLO_Run_2**. Its accuracy is 95.6%, with precision 94%, recall 92%, F1 93%, loss 0.11, learning rate 0.0005, batch size 32, and 30 epochs.
6. Search for `YOLO` using the top bar. Search requests go to Elasticsearch via FastAPI.
7. On Training Runs, select **Completed**, enter `0.9` for minimum accuracy, and apply filters.
8. Create a run, mark it completed, add a metric point and evaluation, then refresh the dashboard to see updated numbers.

## Data model and Elasticsearch usage

Elasticsearch suits this project because its JSON documents fit changing ML metadata, while full-text search, exact filters, range queries, sorting, and aggregations support experiment discovery and analytics. The system uses exactly six indices:

| Index | Purpose |
|---|---|
| `users` | Account identity, roles, bcrypt hashes |
| `projects` | Research workspaces and owners |
| `datasets` | Data sources associated with projects |
| `experiments` | Objectives and multiple dataset IDs |
| `models` | Vision/LLM definitions and embedded versions |
| `training_runs` | Run state, hyperparameters, metrics, history, checkpoints, evaluation, deployment |

Hyperparameters, metrics, checkpoints, evaluation, and deployment belong to one training run and are usually read together. Embedding them avoids extra indices and joins, keeps the run easy to retrieve, and lets Elasticsearch aggregate fields such as `metrics.accuracy`. The mappings use keywords for IDs and statuses, text fields for names/descriptions, dates for timestamps, numeric fields for metrics/epochs, and nested arrays for versions, history, and checkpoints.

The backend demonstrates `multi_match` full-text search, `term` filters, accuracy `range` filters, sorting by date/accuracy, and aggregations for counts, status distribution, deployment count, and average model accuracy. Dashboard cards and charts fetch this API data; they contain no hardcoded values.

## API overview

All routes except `/api/health`, `/api/auth/register`, and `/api/auth/login` require `Authorization: Bearer <token>`. See Swagger for exact request bodies.

- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- CRUD: `/api/projects`, `/api/datasets`, `/api/experiments`, `/api/models`, `/api/runs`
- Versions: `POST /api/models/{model_id}/versions`
- Run actions: `PATCH /api/runs/{run_id}/complete` and `/fail`; `POST` to `/metrics`, `/checkpoint`, `/evaluation`, `/deployment`
- Search: `GET /api/search?q=YOLO`
- Analytics: `/api/dashboard/summary`, `/api/analytics/top-runs`, `/api/analytics/model-performance`, `/api/analytics/status-distribution`

The backend refuses to delete records referenced by other records and returns HTTP 409. Delete dependent runs and experiments first. A record from another workspace returns HTTP 404 even when its ID is known.

## Troubleshooting

- **Docker daemon unavailable:** Start Docker Desktop, wait for its engine to report ready, then run `docker compose up -d` again.
- **Elasticsearch connection refused:** Check `docker compose ps`, then `docker compose logs elasticsearch`. Wait for the health check; the image can take time to boot. Confirm port 9200 is free and `ELASTICSEARCH_URL` points to it.
- **Elasticsearch exits on startup:** Give Docker Desktop more memory (about 2 GB free for the container) and restart with `docker compose up -d`.
- **Backend says an index is missing:** Run `python create_indices.py` and `python seed_data.py` from `backend`.
- **Frontend cannot call the API:** Confirm FastAPI is running at port 8000 and `frontend/.env` contains `VITE_API_URL=http://localhost:8000/api`. Restart Vite after changing `.env`.
- **Login fails:** Make sure the seed command succeeded. Rerun `python seed_data.py --reset` to restore demo accounts.
- **PowerShell blocks virtual environment activation:** Run `Set-ExecutionPolicy -Scope Process Bypass`, then activate the virtual environment again.

## Project structure

```text
backend/
  app/config.py                  Environment settings
  app/elasticsearch_client.py   Elasticsearch connection
  app/auth.py                   Password hashing and JWT authentication
  app/schemas.py                Pydantic validation
  app/db.py                     Workspace-scoped Elasticsearch helpers
  app/main.py                   FastAPI setup and route registration
  app/routes/                 Small route files for each feature
  create_indices.py             Six Elasticsearch mappings
  seed_data.py                  Idempotent demo data
  migrate_workspaces.py          Upgrade existing local data
  tests/test_workspaces.py       Account-isolation API test
frontend/
  src/App.jsx                   App login and route entry point
  src/auth/                    Login and registration
  src/layout/                  Navigation and page layout
  src/components/              Reusable UI components and hooks
  src/pages/                   Dashboard and feature pages
  src/services/api.js           Axios client and token handling
  src/style.css                 Responsive styling
docker-compose.yml             Elasticsearch 8.17
```

This is a local academic demo. Search and list responses are capped at 500 documents; pagination would be needed for a large production installation. Elasticsearch security is disabled in Docker Compose for local setup, so do not expose port 9200 publicly. Before deployment, add production authentication, HTTPS, secrets management, and a secured Elasticsearch network; the current Docker configuration is intended only for local testing.
