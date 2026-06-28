# GuitarLab AI

GuitarLab AI is a monorepo for guitar-focused web tools.

Current focus:

* **Valeton GP-200 Tone Maker**: generate structured GP-200 patches from a tone request.
* **Practice Coach**: upload `.wav` guitar audio and return basic audio-analysis metrics.

The app uses:

* **Frontend**: Next.js + TypeScript
* **Backend**: FastAPI + Python

---

## Project Structure

```text
apps/
  frontend/   Next.js frontend
  backend/    FastAPI backend

docs/         Project notes and API docs
```

---

## Run the Project Locally

Open the repo in VS Code or Cursor, then use two terminals:

* one for the backend
* one for the frontend

---

## 1. Set Up the Backend

From the repo root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r apps/backend/requirements.txt
```

If the virtual environment ever breaks, delete it and recreate it:

```bash
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r apps/backend/requirements.txt
```

---

## 2. Start the Backend

From the repo root, with `.venv` activated:

```bash
PYTHONPATH=apps/backend python -m uvicorn app.main:app --reload --app-dir apps/backend
```

The backend runs at:

```text
http://127.0.0.1:8000
```

API docs are available at:

```text
http://127.0.0.1:8000/docs
```

If opening `http://127.0.0.1:8000` shows this:

```json
{"detail": "Not Found"}
```

that is normal. The backend does not currently have a homepage route.

---

## 3. Start the Frontend

Open a second terminal:

```bash
cd apps/frontend
npm install
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000 npm run dev
```

The frontend runs at:

```text
http://localhost:3000
```

The GP-200 Tone Maker page is:

```text
http://localhost:3000/tone-maker/gp200
```

The root page may still show the default Next.js starter page. That is expected until the final homepage is designed.

---

## 4. Run Backend Tests

From the repo root, with `.venv` activated:

```bash
PYTHONPATH=apps/backend python -m pytest apps/backend/tests -v
```

---

## 5. Run Frontend Checks

From the repo root:

```bash
npm run test --prefix apps/frontend
npm run lint --prefix apps/frontend
npm run build --prefix apps/frontend
```

---

## Manual API Tests

### GP-200 Tone Maker

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

* `device`
* `model`
* `style`
* `tone_intent`
* `modules`
* `dial_in_instructions`
* `warnings`
* `valid`
* `errors`

---

### Practice Coach

With the backend running:

```bash
curl -X POST http://127.0.0.1:8000/practice/analyze-audio \
  -F "audio_file=@practice.wav"
```

Current limitation:

```text
.wav files only
```

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
* `valid`
* `errors`

---

## Current Status

### GP-200 Tone Maker

Implemented:

* tone goal input
* pickup type input
* connection mode input
* deterministic GP-200 patch generation
* verified GP-200 effects where available
* patch validation
* warnings and errors
* dial-in instructions
* basic frontend test page

Not implemented yet:

* `.prst` file export
* final UI design
* conversational patch editing
* LLM or agent features

---

### Practice Coach

Implemented:

* `.wav` upload endpoint
* audio feature extraction
* basic deterministic scoring metrics

Not implemented yet:

* frontend upload page
* pitch scoring
* note correctness
* riff-to-tab
* full coaching feedback
* LLM or agent features

---

## Troubleshooting

### Backend shows `{"detail":"Not Found"}`

That is normal. Use:

```text
http://127.0.0.1:8000/docs
```

or test a real endpoint with `curl`.

---

### Next.js shows an `allowedDevOrigins` warning

Use the frontend through:

```text
http://localhost:3000/tone-maker/gp200
```

instead of:

```text
http://127.0.0.1:3000/tone-maker/gp200
```

---

### Generate Patch changes the URL instead of creating a patch

If clicking **Generate Patch** changes the URL to something like:

```text
/tone-maker/gp200?tone_goal=...
```

then the frontend form is submitting as a normal HTML GET request.

The form should instead call the backend with:

```text
POST http://127.0.0.1:8000/tone-maker/gp200
```

When working correctly, the backend terminal should show:

```text
POST /tone-maker/gp200
```

---

## Product Direction

GuitarLab AI should stay grounded in structured backend logic.

The GP-200 Tone Maker should use real GP-200 effect data, validation rules, and connection-mode logic. It should not invent unsupported GP-200 effects.

The Practice Coach should build from measurable audio analysis first. More advanced coaching, pitch tracking, riff-to-tab, and AI explanations can be added later.

The project should not become a generic GPT wrapper.
