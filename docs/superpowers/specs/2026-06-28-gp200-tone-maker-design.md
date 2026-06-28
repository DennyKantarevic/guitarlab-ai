# GP-200 Tone Maker Design

## Goal

Add `/tone-maker/gp200` as a Next.js page that collects a tone goal, pickup type, and connection mode, then calls FastAPI for deterministic placeholder GP-200 patch data.

## Backend Boundary

FastAPI owns the GP-200 tone logic boundary. The frontend sends `tone_goal`, `pickup_type`, and `connection_mode`; the backend validates the connection mode and returns typed patch JSON.

The response stays close to the future patch format:

- `device`
- `model`
- `tone_goal`
- `pickup_type`
- `connection_mode`
- `signal_chain`
- `modules`
- `warnings`
- `valid`

No LLM calls are in scope. The backend response is deterministic and rule-based.

## Frontend Behavior

The Next.js page at `/tone-maker/gp200` renders an interactive form. It uses `NEXT_PUBLIC_BACKEND_URL` for the FastAPI base URL and defaults to `http://127.0.0.1:8000`.

The page shows loading, error, and success states. The success state renders a patch card from the backend response.

## Validation And Tests

Backend tests cover valid requests and invalid connection modes. Frontend tests cover API client behavior and the page form states.
