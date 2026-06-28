# GuitarLab AI

Monorepo for a Next.js TypeScript frontend and FastAPI Python backend.

## Repository Layout

- `apps/frontend` - Next.js TypeScript frontend
- `apps/backend` - FastAPI backend

## Running Locally in VS Code

### 1. Open the repo in VS Code

- Open VS Code.
- Choose **File > Open Folder**.
- Select the `guitarlab-ai` repo folder.
- Open the integrated terminal with **Terminal > New Terminal**.

### 2. Set up the backend environment

From the repo root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r apps/backend/requirements.txt
```

After activation, the terminal prompt should show `(.venv)`.

If `.venv` setup was interrupted or looks broken, delete it and recreate it:

```bash
rm -rf .venv
```

### 3. Run backend tests

From the repo root:

```bash
PYTHONPATH=apps/backend python -m pytest apps/backend/tests -v
```

The current expected result is the backend test suite passing.

### 4. Start the backend server

From the repo root:

```bash
PYTHONPATH=apps/backend python -m uvicorn app.main:app --reload --app-dir apps/backend
```

The backend runs at http://127.0.0.1:8000.

Opening http://127.0.0.1:8000 may show `404` because there is no homepage route. API docs are available at http://127.0.0.1:8000/docs.

The GP-200 endpoint is `POST /tone-maker/gp200`. The Practice Coach audio-analysis endpoint is `POST /practice/analyze-audio`.

### 5. Test the GP-200 API manually

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

### 6. Set up and run the frontend

```bash
cd apps/frontend
npm install
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000 npm run dev
```

The frontend runs at http://127.0.0.1:3000.

The GP-200 page is http://127.0.0.1:3000/tone-maker/gp200.

The frontend currently provides a basic testable interface, not the final designed UI.

### 7. Run frontend checks

From the repo root:

```bash
npm run test --prefix apps/frontend
npm run lint --prefix apps/frontend
npm run build --prefix apps/frontend
```

## Current MVP Status

The current completed MVP is the Valeton GP-200 Tone Maker backend and basic frontend route. The backend accepts a tone goal, pickup type, and connection mode. It generates a deterministic GP-200 patch using verified GP-200 effects where available.

The backend includes tone intent matching, connection-mode rules, patch validation, warnings, errors, and dial-in instructions. It also includes the first Practice Coach audio-analysis endpoint for uploaded `.wav` files. It does not use LLM calls or agents yet, does not generate `.prst` files yet, and does not include the final UI design yet. Full Practice Coach feedback, riff-to-tab, and broad audio upload support are not implemented yet.

## Future Product Direction

The long-term goal is for the website UI to be interactive. A user should be able to type a prompt like "make me a tight metal rhythm tone for my Valeton GP-200."

Then the app should:

- generate a GP-200 patch
- show the selected effects, modules, warnings, and dial-in instructions
- allow the user to tweak the patch conversationally or through controls

Example future interactions:

- "make it less fizzy"
- "add more chorus"
- "turn this into a cleaner indie tone"
- "adjust it for headphones"
- "adjust it for going into the front of my amp"
- "make the patch more like grunge"
- "reduce gain and add room reverb"

Future interactive responses should still be grounded in the structured GP-200 backend. The system should not become a generic GPT wrapper. The UI should call backend patch-generation and validation logic. LLM or agent features, if added later, should explain and modify structured patch data rather than invent unsupported GP-200 effects.

GP-200 API examples and demo requests:

- [docs/gp200_api_examples.md](docs/gp200_api_examples.md)
- [docs/gp200_backend_demo_status.md](docs/gp200_backend_demo_status.md)
- [docs/practice_coach_audio_analysis.md](docs/practice_coach_audio_analysis.md)
