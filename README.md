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

Useful commands:

```bash
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
