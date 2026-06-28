# GuitarLab AI

Monorepo for a Next.js TypeScript frontend and FastAPI Python backend.

## Repository Layout

- `apps/frontend` - Next.js TypeScript frontend
- `apps/backend` - FastAPI backend

## Frontend Setup

```bash
cd apps/frontend
npm install
npm run dev
```

The frontend runs at http://localhost:3000.

Set `NEXT_PUBLIC_BACKEND_URL` if your FastAPI backend is not running at the default:

```bash
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000 npm run dev
```

Useful commands:

```bash
npm run test
npm run lint
npm run build
```

## Backend Setup

```bash
cd apps/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend runs at http://127.0.0.1:8000.

Useful commands:

```bash
PYTHONPATH=. pytest
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

GP-200 tone maker request:

```bash
curl -X POST http://127.0.0.1:8000/tone-maker/gp200 \
  -H "Content-Type: application/json" \
  -d '{
    "tone_goal": "tight modern rhythm",
    "pickup_type": "humbucker bridge",
    "connection_mode": "fx_return"
  }'
```

GP-200 API examples and demo requests:

- [docs/gp200_api_examples.md](docs/gp200_api_examples.md)
- [docs/gp200_backend_demo_status.md](docs/gp200_backend_demo_status.md)

Run the backend test suite from the repo root:

```bash
PYTHONPATH=apps/backend .venv/bin/pytest apps/backend/tests -v
```
