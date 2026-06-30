# GuitarLab AI

GuitarLab AI is a guitar-focused practice and tone assistant. It combines deterministic audio analysis, structured reference exercises, and device-aware tone generation for electric guitar workflows.

The project is intentionally not a generic GPT wrapper. The goal is useful, explainable guitar tooling: measured audio features, clear feedback, validated device data, and honest limitations.

The frontend uses a dark electric guitar / band-inspired UI for the home page, Practice Coach, and GP-200 Tone Maker.

## Features

### Practice Coach

The Practice Coach helps review a recorded `.wav` take.

It can:

* Upload a `.wav` guitar recording.
* Choose a practice focus and add a short description.
* Optionally compare against expected notes, simple single-note tab, chords, or a strumming pattern.
* Return focused coach feedback, approximate comparisons, and practical next steps.
* Track compact practice history locally in the browser.
* Keep raw audio metrics in a collapsed technical details section.

Practice Coach page:

```text
http://localhost:3000/practice-coach
```

### Valeton GP-200 Tone Maker

The GP-200 Tone Maker creates a deterministic patch plan for the Valeton GP-200.

It can:

* Accept a tone goal, pickup type, and connection mode.
* Generate a structured GP-200 patch plan.
* Validate modules, effects, parameters, and connection-mode rules.
* Return warnings, validation status, and dial-in instructions.

GP-200 page:

```text
http://localhost:3000/tone-maker/gp200
```

## Repo Structure

```text
apps/
  backend/    FastAPI backend
  frontend/   Next.js TypeScript frontend

docs/         API docs, demo notes, and project support docs
```

## How to Demo the App

Start the backend and frontend first. Then open:

```text
http://localhost:3000
```

### Practice Coach Demo

Open:

```text
http://localhost:3000/practice-coach
```

Try this flow:

1. Choose a practice focus, such as **Timing and rhythm** or **Note clarity**.
2. Add a goal, such as `Eighth-note alternate picking`.
3. Upload a `.wav` recording.
4. Try one reference format:

Expected notes:

```text
A4 B4 C5 D5
```

Expected tab:

```text
e|----------------|
B|----------------|
G|----------------|
D|----------------|
A|-----0-2-3------|
E|-0-3------------|
```

Expected chords:

```text
G C D Em
```

Expected strumming:

```text
D D U U D U
```

Point out:

* The main score and coach feedback.
* Reference, chord-tone, or strumming comparison when a reference is provided.
* Progress compared with the last similar local session.
* Local practice history.
* Collapsed technical details for audio metrics and raw analysis.

### GP-200 Tone Maker Demo

Open:

```text
http://localhost:3000/tone-maker/gp200
```

Try tone goals like:

```text
warm blues lead
tight metal rhythm
ambient clean worship
```

Choose a pickup type, such as:

```text
humbucker bridge
single coil neck
```

Choose a connection mode, generate a patch, then point out:

* The selected style and tone intent.
* GP-200 module settings.
* Warnings and validation status.
* Dial-in instructions for manually setting up the device.

## Local Setup

### Backend

From the repo root:

```bash
cd /path/to/guitarlab-ai
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r apps/backend/requirements.txt
```

After pulling updates, run this again with the virtual environment active:

```bash
source .venv/bin/activate
pip install -r apps/backend/requirements.txt
```

Start the backend:

```bash
PYTHONPATH=apps/backend python -m uvicorn app.main:app --reload --app-dir apps/backend
```

Backend URLs:

```text
http://127.0.0.1:8000
http://127.0.0.1:8000/docs
```

The backend root may show `{"detail":"Not Found"}`. That is normal because the backend does not have a homepage route.

### Frontend

From another terminal:

```bash
npm install --prefix apps/frontend
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000 npm run dev --prefix apps/frontend
```

Frontend URLs:

```text
http://localhost:3000
http://localhost:3000/practice-coach
http://localhost:3000/tone-maker/gp200
```

## Manual API Tests

### Practice Coach

```bash
curl -X POST http://127.0.0.1:8000/practice/analyze-audio \
  -F "audio_file=@practice.wav" \
  -F "practice_focus=timing" \
  -F "practice_description=Working on eighth-note alternate picking" \
  -F "expected_notes=A4 B4 C5 D5"
```

The file must be a `.wav` file. Use a full file path if `practice.wav` is not in the current directory.

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

## Tests and Checks

Backend:

```bash
PYTHONPATH=apps/backend .venv/bin/python -m pytest apps/backend/tests -v
```

Frontend:

```bash
npm run test --prefix apps/frontend
npm run lint --prefix apps/frontend
npm run build --prefix apps/frontend
```

## Important Limitations

### Practice Coach

* `.wav` upload only.
* Analysis and scoring are approximate.
* Monophonic note detection works best on clean single-note recordings.
* Tab support is simple six-line single-note guitar tab only.
* Chord support checks approximate chord-tone coverage, not full chord recognition.
* Strumming support checks attack activity, not upstroke/downstroke direction.
* No song lookup.
* No copyrighted tab, chord, or pattern lookup.
* No exact rhythm scoring.
* No note correctness scoring.
* Practice history is local browser storage only. Audio files are not saved.

### GP-200 Tone Maker

* Patch generation is deterministic and profile-based.
* The app is not connected directly to a physical GP-200.
* The user still dials settings manually on the device.
* Effects and modules are constrained to the current validated GP-200 profile data.
* `.prst` export/import is not implemented yet.

## Troubleshooting

If the backend raises `ModuleNotFoundError: No module named 'librosa'`, activate the virtual environment and reinstall backend requirements:

```bash
source .venv/bin/activate
pip install -r apps/backend/requirements.txt
```

If `GET /practice/analyze-audio` returns 404, that is expected. It is a `POST` API endpoint. Use the Practice Coach page or the curl command above.

If Practice Coach upload fails, confirm the file is a `.wav`. Other audio formats are not supported yet.

## Project Philosophy

GuitarLab AI is built around deterministic logic first:

* Explain what the system measured or selected.
* Prefer structured backend data over unsupported guesses.
* Be honest about approximate analysis.
* Avoid fake AI claims.
* Add LLMs or agents later only as helpers around validated data, not as unsupported analysis engines.

## More Docs

* [Demo script](docs/demo_script.md)
* [Practice Coach API and limitations](docs/practice_coach_audio_analysis.md)
* [GP-200 API examples](docs/gp200_api_examples.md)
* [GP-200 backend demo status](docs/gp200_backend_demo_status.md)
