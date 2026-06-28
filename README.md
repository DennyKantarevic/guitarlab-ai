# GuitarLab AI

Monorepo for a Next.js TypeScript frontend and FastAPI Python backend.

## Project Overview

GuitarLab AI currently contains an MVP Valeton GP-200 Tone Maker. The backend accepts a tone goal, pickup type, and connection mode, then returns deterministic patch JSON for the GP-200. The frontend has a minimal form at `/tone-maker/gp200` that calls the FastAPI endpoint.

## Current Implemented MVP

- FastAPI endpoint: `POST /tone-maker/gp200`.
- Deterministic tone intent matching for supported style templates.
- Valeton GP-200 device profile with manually verified effects where available.
- Style templates, connection-mode rules, patch validation, warnings, and errors.
- Deterministic dial-in instructions generated from the validated patch JSON.
- Frontend API type sync and tests for the current response contract.

## Intentionally Not Implemented Yet

- LLM calls or agents.
- Practice Coach, riff-to-tab, or audio upload.
- `.prst` export.
- Complete official GP-200 effect catalog.
- Website redesign, landing page, dashboard, or theme system.

## Repository Layout

- `apps/backend` - FastAPI backend.
- `apps/frontend` - Next.js TypeScript frontend.
- `docs` - GP-200 API, demo status, and verified-effect intake notes.

## Backend Setup

From the repo root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r apps/backend/requirements.txt
PYTHONPATH=apps/backend uvicorn app.main:app --reload
```

The backend runs at `http://127.0.0.1:8000`.

Health check:

```bash
curl http://127.0.0.1:8000/health
```

## Frontend Setup

```bash
cd apps/frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:3000`.

## Environment Variables

- `NEXT_PUBLIC_BACKEND_URL`: Optional frontend backend URL. Defaults to `http://127.0.0.1:8000`.

Example:

```bash
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000 npm run dev --prefix apps/frontend
```

## Backend Tests

From the repo root:

```bash
PYTHONPATH=apps/backend .venv/bin/pytest apps/backend/tests -v
```

## Frontend Checks

From the repo root:

```bash
npm run test --prefix apps/frontend
npm run lint --prefix apps/frontend
npm run build --prefix apps/frontend
```

## Manual GP-200 API Test

Start the backend, then run:

```bash
curl -X POST http://127.0.0.1:8000/tone-maker/gp200 \
  -H "Content-Type: application/json" \
  -d '{
    "tone_goal": "metal tight chug heavy rhythm",
    "pickup_type": "humbucker bridge",
    "connection_mode": "direct_usb"
  }'
```

Shortened expected response:

```json
{
  "device": "Valeton",
  "model": "GP-200",
  "style": "metal",
  "tone_intent": {
    "selected_style": "metal",
    "matched_keywords": ["metal", "tight", "chug", "heavy"],
    "fallback_used": false,
    "confidence": "high"
  },
  "modules": {
    "AMP": {
      "enabled": true,
      "effect": "amp_mess_dualm"
    },
    "CAB": {
      "enabled": true,
      "effect": "cab_uk_ld"
    }
  },
  "dial_in_instructions": [
    "Create a new patch on the Valeton GP-200.",
    "Set the signal chain to: PRE > WAH > DST > AMP > NR > CAB > EQ > MOD > DLY > RVB > VOL."
  ],
  "warnings": ["Humbucker pickup detected: trimmed amp gain slightly."],
  "valid": true,
  "errors": []
}
```

## GP-200 Docs

- [GP-200 API examples](docs/gp200_api_examples.md)
- [GP-200 backend demo status](docs/gp200_backend_demo_status.md)
- [Verified effect intake template](docs/gp200_verified_effect_intake_template.md)
