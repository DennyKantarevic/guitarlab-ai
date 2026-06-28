# GuitarLab AI

Monorepo for a Next.js TypeScript frontend and FastAPI Python backend.

## Repository Layout

- `apps/frontend` - Next.js TypeScript frontend
- `apps/backend` - FastAPI backend

## How to Run

### Backend

From the repo root, install backend dependencies once if needed:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r apps/backend/requirements.txt
```

Start the FastAPI backend:

```bash
cd apps/backend
source ../../.venv/bin/activate
PYTHONPATH=. uvicorn app.main:app --reload
```

The backend runs at http://127.0.0.1:8000.

### Frontend

Install frontend dependencies once if needed:

```bash
cd apps/frontend
npm install
```

Start the Next.js frontend:

```bash
cd apps/frontend
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000 npm run dev
```

The frontend runs at http://127.0.0.1:3000.

GP-200 page:

```text
http://127.0.0.1:3000/tone-maker/gp200
```

### Manual API Test

With the backend running:

```bash
curl -X POST http://127.0.0.1:8000/tone-maker/gp200 \
  -H "Content-Type: application/json" \
  -d '{
    "tone_goal": "metal tight chug heavy rhythm",
    "pickup_type": "humbucker bridge",
    "connection_mode": "direct_usb"
  }'
```

The response should include:

- `device`: `Valeton`
- `model`: `GP-200`
- `style`
- `tone_intent`
- `modules`
- `dial_in_instructions`
- `warnings`
- `valid`
- `errors`

### Tests

From the repo root:

```bash
PYTHONPATH=apps/backend .venv/bin/pytest apps/backend/tests -v

npm run test --prefix apps/frontend
npm run lint --prefix apps/frontend
npm run build --prefix apps/frontend
```

GP-200 API examples and demo requests:

- [docs/gp200_api_examples.md](docs/gp200_api_examples.md)
- [docs/gp200_backend_demo_status.md](docs/gp200_backend_demo_status.md)
