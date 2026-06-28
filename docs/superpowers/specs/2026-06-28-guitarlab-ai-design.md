# GuitarLab AI Monorepo Design

## Goal

Create a private GitHub repository named `AtomicDenny/guitarlab-ai` containing a monorepo with a Next.js TypeScript frontend and a FastAPI Python backend.

## Scope

- Repository root: `guitarlab-ai`
- Frontend app: `apps/frontend`
- Backend app: `apps/backend`
- Documentation: root `README.md` with setup instructions for both apps
- GitHub: private repository under the requested `AtomicDenny` owner

## Architecture

The repository uses a lightweight monorepo layout without a task runner. The frontend and backend can be installed and run independently, which keeps the starter simple and avoids committing to workspace tooling before shared packages exist.

The frontend is a standard Next.js TypeScript app using the App Router. The backend is a FastAPI app with a minimal `/health` endpoint and a pytest test covering that endpoint.

## Data Flow

There is no frontend-to-backend integration in the starter scope. The backend exposes `/health` so local setup and deployment checks have a stable endpoint.

## Testing

- Backend: pytest verifies `GET /health`.
- Frontend: Next.js lint and build verify the generated TypeScript app.

## GitHub Publishing

Use `gh` to create `AtomicDenny/guitarlab-ai` as a private repository and push the local `main` branch. If the authenticated GitHub account does not have permission to create repositories under `AtomicDenny`, stop and report the exact blocker rather than creating the repository under a different owner.
