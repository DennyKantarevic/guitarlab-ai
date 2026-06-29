# GuitarLab AI

GuitarLab AI is a monorepo for guitar-focused web tools.

Current MVPs:

* **Valeton GP-200 Tone Maker**: generate structured GP-200 patch JSON from a tone goal, pickup type, and connection mode.
* **Practice Coach**: upload a `.wav` guitar recording and return deterministic audio-analysis features, basic practice scoring metrics, recording-quality checks, segment analysis, measured feedback, and local browser practice history.

The project uses a Next.js TypeScript frontend and a FastAPI Python backend.

## Repo Structure

```text
apps/
  frontend/   Next.js frontend
  backend/    FastAPI backend

docs/         Project notes and API docs
```

## Backend Setup

From the repo root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r apps/backend/requirements.txt
```

If `.venv` setup was interrupted, recreate it:

```bash
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r apps/backend/requirements.txt
```

## Run the Backend

From the repo root, with `.venv` activated:

```bash
PYTHONPATH=apps/backend python -m uvicorn app.main:app --reload --app-dir apps/backend
```

Backend URL:

```text
http://127.0.0.1:8000
```

FastAPI docs:

```text
http://127.0.0.1:8000/docs
```

Backend endpoints:

* `POST /tone-maker/gp200`
* `POST /practice/analyze-audio`

## Run the Frontend

From a second terminal:

```bash
cd apps/frontend
npm install
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000 npm run dev
```

Frontend URL:

```text
http://localhost:3000
```

Pages:

* GP-200 Tone Maker: `http://localhost:3000/tone-maker/gp200`
* Practice Coach: `http://localhost:3000/practice-coach`

## Running the Practice Coach

### 1. Pull latest main

```bash
cd /Users/dennykantarevic/guitarlab-ai
git checkout main
git pull origin main
```

### 2. Install or update backend dependencies

```bash
source .venv/bin/activate
pip install -r apps/backend/requirements.txt
```

Run this after pulling new backend features or if you see `ModuleNotFoundError: No module named 'librosa'`. The Practice Coach depends on audio-analysis packages such as `librosa`.

### 3. Start the backend

```bash
PYTHONPATH=apps/backend python -m uvicorn app.main:app --reload --app-dir apps/backend
```

Backend URL:

```text
http://127.0.0.1:8000
```

API docs:

```text
http://127.0.0.1:8000/docs
```

Opening `/practice/analyze-audio` in a browser shows 404 because it is a `POST` API endpoint, not a normal webpage.

### 4. Start the frontend

```bash
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000 npm run dev --prefix apps/frontend
```

Frontend URL:

```text
http://localhost:3000
```

Practice Coach page:

```text
http://localhost:3000/practice-coach
```

### 5. Test through the website

1. Open `http://localhost:3000/practice-coach`.
2. Upload a `.wav` file.
3. Click **Analyze**.
4. Confirm the page shows audio analysis fields, `practice_metrics`, `recording_quality`, `segment_analysis`, `coach_feedback`, and Practice history.

Expected displayed fields include:

* `filename`
* `duration_seconds`
* `sample_rate`
* `tempo_bpm`
* `onset_count`
* `rms_energy_mean`
* `spectral_centroid_mean`
* `zero_crossing_rate_mean`
* `valid`
* `errors`
* `practice_metrics.overall_score`
* `practice_metrics.timing_activity_score`
* `practice_metrics.recording_quality_score`
* `practice_metrics.recommendations`
* `recording_quality.quality_level`
* `recording_quality.warnings`
* `segment_analysis`
* `coach_feedback.summary`
* `coach_feedback.next_steps`
* local Practice history score summaries

Practice history is stored only in the current browser with `localStorage`. Uploaded audio files are not saved, and history is not sent to the backend.

### 6. Test the backend directly with curl

```bash
curl -X POST http://127.0.0.1:8000/practice/analyze-audio \
  -F "audio_file=@practice.wav"
```

The file must be a `.wav` file and should be located wherever the curl command is run. You can also use the full path to the file.

## Tests and Checks

Backend tests:

```bash
PYTHONPATH=apps/backend python -m pytest apps/backend/tests -v
```

Frontend checks:

```bash
npm run test --prefix apps/frontend
npm run lint --prefix apps/frontend
npm run build --prefix apps/frontend
```

## Manual API Tests

### GP-200 Tone Maker

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

* `device`
* `model`
* `style`
* `tone_intent`
* `modules`
* `dial_in_instructions`
* `warnings`
* `valid`
* `errors`

### Practice Coach

```bash
curl -X POST http://127.0.0.1:8000/practice/analyze-audio \
  -F "audio_file=@practice.wav"
```

Current limitation: Practice Coach accepts `.wav` files only.

The response should include:

* `filename`
* `duration_seconds`
* `sample_rate`
* `tempo_bpm`
* `onset_count`
* `rms_energy_mean`
* `spectral_centroid_mean`
* `zero_crossing_rate_mean`
* `analysis_warnings`
* `practice_metrics`
* `recording_quality`
* `segment_analysis`
* `coach_feedback`
* `valid`
* `errors`

## Current Status

Implemented:

* GP-200 frontend page at `/tone-maker/gp200`
* GP-200 backend endpoint at `POST /tone-maker/gp200`
* GP-200 deterministic tone intent matching, connection-mode rules, patch validation, warnings, and dial-in instructions
* GP-200 frontend form fix so Generate Patch uses the client submit handler and does not navigate to a GET query-string URL
* Practice Coach frontend page at `/practice-coach`
* Practice Coach backend endpoint at `POST /practice/analyze-audio`
* Practice Coach `.wav` audio-analysis features
* Practice Coach deterministic `practice_metrics` scoring
* Practice Coach recording-quality checks, fixed-length segment analysis, and deterministic measured feedback
* Practice Coach local browser history for recent compact score summaries

Not implemented yet:

* LLM calls or agents
* user accounts, authentication, database-backed history, or cross-device sync
* final UI design
* `.prst` export
* pitch detection or note correctness scoring
* riff-to-tab or tab generation
* polished conversational coaching

Practice Coach timing and activity fields are proxies from detected audio features. They are not true rhythmic accuracy, pitch accuracy, note correctness, or song/riff matching.

## Troubleshooting

### Backend root shows `{"detail":"Not Found"}`

That is normal. The backend does not currently have a homepage route. Use:

```text
http://127.0.0.1:8000/docs
```

or test a real endpoint with `curl`.

### `ModuleNotFoundError: No module named 'librosa'`

Activate the backend environment and reinstall requirements:

```bash
source .venv/bin/activate
pip install -r apps/backend/requirements.txt
```

### `GET /practice/analyze-audio` returns 404

That is normal. `/practice/analyze-audio` is a `POST` API endpoint. Use the Practice Coach frontend page or the curl command above.

### Practice Coach page does not load

Update `main`, clear the frontend build cache, and restart the dev server:

```bash
git checkout main
git pull origin main
rm -rf apps/frontend/.next
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000 npm run dev --prefix apps/frontend
```

### Practice Coach upload fails

Make sure the file is a `.wav` file. Other formats are not supported yet.

### Generate Patch changes the URL

If clicking **Generate Patch** changes the URL to something like:

```text
/tone-maker/gp200?tone_goal=...
```

then the frontend form is submitting as a normal HTML GET request.

The form should use `onSubmit={handleSubmit}`, call `event.preventDefault()`, and call the backend with:

```text
POST http://127.0.0.1:8000/tone-maker/gp200
```

When working correctly, the backend terminal should show:

```text
POST /tone-maker/gp200
```

### Next.js local dev origin warning

Use the frontend through:

```text
http://localhost:3000
```

The frontend config allows `127.0.0.1` as a local dev origin when needed.

## Docs

* [GP-200 API examples](docs/gp200_api_examples.md)
* [GP-200 backend demo status](docs/gp200_backend_demo_status.md)
* [Practice Coach audio analysis](docs/practice_coach_audio_analysis.md)
