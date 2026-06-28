# GuitarLab AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a private `guitarlab-ai` monorepo with a Next.js TypeScript frontend, FastAPI backend, tests, and setup documentation.

**Architecture:** Use a lightweight monorepo with independent apps under `apps/frontend` and `apps/backend`. Keep shared tooling out of scope until the project needs shared packages or coordinated task running.

**Tech Stack:** Next.js, TypeScript, npm, Python 3.12, FastAPI, Uvicorn, pytest, GitHub CLI.

---

### Task 1: Repository Skeleton

**Files:**
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: Create root ignore rules**

```gitignore
# dependencies
node_modules/
.venv/
__pycache__/
.pytest_cache/

# build output
.next/
out/
dist/
build/

# environment
.env
.env.*
!.env.example

# system
.DS_Store
```

- [ ] **Step 2: Add an initial README shell**

```markdown
# GuitarLab AI

Monorepo for the GuitarLab AI frontend and backend.
```

- [ ] **Step 3: Commit planning and skeleton files**

```bash
git add .gitignore README.md docs
git commit -m "chore: add monorepo plan"
```

### Task 2: Backend App

**Files:**
- Create: `apps/backend/app/__init__.py`
- Create: `apps/backend/app/main.py`
- Create: `apps/backend/tests/test_health.py`
- Create: `apps/backend/requirements.txt`

- [ ] **Step 1: Write the failing backend test**

Create `apps/backend/requirements.txt`:

```text
fastapi
uvicorn[standard]
pytest
httpx
```

Create `apps/backend/tests/test_health.py`:

```python
import asyncio

import httpx

from app.main import app


def test_health_endpoint_returns_ok():
    async def request_health():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            return await client.get("/health")

    response = asyncio.run(request_health())

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "guitarlab-ai-backend"}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m venv .venv && .venv/bin/pip install -r apps/backend/requirements.txt && PYTHONPATH=apps/backend .venv/bin/pytest apps/backend/tests/test_health.py -v`

Expected: FAIL with a missing `app.main` import. Add a minimal FastAPI app shell without `/health`, then rerun to get `assert 404 == 200`.

- [ ] **Step 3: Implement the FastAPI app**

```python
from fastapi import FastAPI

app = FastAPI(title="GuitarLab AI API")


@app.get("/health")
def health():
    return {"status": "ok", "service": "guitarlab-ai-backend"}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `PYTHONPATH=apps/backend .venv/bin/pytest apps/backend/tests/test_health.py -v`

Expected: PASS.

### Task 3: Frontend App

**Files:**
- Create: `apps/frontend/*`

- [ ] **Step 1: Scaffold Next.js TypeScript app**

Run: `npx create-next-app@latest apps/frontend --ts --eslint --app --src-dir --import-alias "@/*" --use-npm --yes --disable-git`

- [ ] **Step 2: Verify frontend quality checks**

Run: `npm run lint --prefix apps/frontend`

Expected: PASS.

Run: `npm run build --prefix apps/frontend`

Expected: PASS.

### Task 4: Documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace README with setup instructions**

```markdown
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
```

- [ ] **Step 2: Commit implementation**

```bash
git add .
git commit -m "chore: scaffold frontend and backend"
```

### Task 5: Private GitHub Repository

**Files:**
- No file changes.

- [ ] **Step 1: Confirm GitHub authentication**

Run: `gh auth status`

Expected: authenticated with `repo` scope.

- [ ] **Step 2: Create private GitHub repository**

Run: `gh repo create AtomicDenny/guitarlab-ai --private --source=. --remote=origin --push`

Expected: private repository created and `main` pushed.

- [ ] **Step 3: Verify remote repository visibility**

Run: `gh repo view AtomicDenny/guitarlab-ai --json nameWithOwner,visibility,url`

Expected: `visibility` is `PRIVATE`.
