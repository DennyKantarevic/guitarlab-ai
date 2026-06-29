# AGENTS.md

## Project: GuitarLab AI

GuitarLab AI is a monorepo with:

* `apps/backend`: FastAPI Python backend
* `apps/frontend`: Next.js TypeScript frontend
* `docs`: project documentation, API examples, and verification notes

The project combines AI/audio/music tooling for electric guitar. The current completed MVP is the **Valeton GP-200 Tone Maker**. The next major area is the **Practice Coach**, which should be built backend-first using measurable audio analysis before adding UI polish or LLM features.

---

## Core Product Direction

The long-term goal is an interactive guitar tools website where a user can:

1. Prompt for a Valeton GP-200 patch.
2. Receive a validated GP-200 patch using real/verified GP-200 effects.
3. Interactively tweak the patch conversationally or through controls.
4. Eventually upload guitar audio for practice feedback and riff-to-tab features.

Example future interactions:

* “Make it less fizzy.”
* “Add more chorus.”
* “Turn this into a cleaner indie tone.”
* “Adjust it for headphones.”
* “Adjust it for going into the front of my amp.”
* “Make the patch more like grunge.”
* “Reduce gain and add room reverb.”

Important: the app must not become a generic GPT wrapper. LLMs/agents, if added later, should explain, modify, or orchestrate structured backend data. They should not invent unsupported effects, fake settings, or unsupported device behavior.

---

## Current Implemented MVP: Valeton GP-200 Tone Maker

The GP-200 backend MVP includes:

* `POST /tone-maker/gp200`
* deterministic tone intent matching
* pickup adjustment rules
* connection-mode rules
* verified Valeton GP-200 effects where available
* seed-profile effects where not yet verified
* style templates
* patch generation
* patch validation
* warnings and errors
* deterministic dial-in instructions
* frontend API type sync
* basic testable frontend route at `/tone-maker/gp200`

The GP-200 Tone Maker should remain structured and deterministic unless explicitly asked to add LLM/agent behavior.

---

## Practice Coach Direction

The Practice Coach should be built in layers:

1. Audio upload and feature extraction.
2. Basic deterministic practice metrics.
3. Later: pitch tracking, timing accuracy, reference exercises, and note correctness.
4. Later: frontend upload page.
5. Later: LLM explanations grounded in measured data.

The first layers should not use LLM calls or agents.

Practice Coach should be grounded in actual audio measurements such as:

* duration
* sample rate
* tempo estimate
* onset count
* RMS energy
* spectral centroid
* zero-crossing rate
* onset density
* basic recording quality and activity metrics

Do not claim true timing accuracy, pitch accuracy, or note correctness until those are actually implemented.

---

## Non-Negotiable Rules

### Do not redesign the UI unless explicitly asked

Do not add or redesign:

* homepage
* landing page
* dashboard
* theme system
* layout system
* polished app design
* large component library
* branding overhaul

The user wants to design the website later through specific prompts.

Frontend changes should be minimal, testable, and functional unless the user specifically requests design work.

### Do not add LLMs or agents unless explicitly asked

Do not add:

* OpenAI calls
* agent frameworks
* chat orchestration
* conversational patch editing
* AI-generated explanations

unless the user explicitly asks for that feature.

### Do not invent official GP-200 effects

Official GP-200 effects must only be marked as verified if they come from a documented source such as:

* Valeton GP-200 manual
* GP-200 editor
* GP-200 export
* user-provided verified source

Do not infer, guess, or generate official effect names.

If an effect is not verified, it must remain `verified: false`.

### Do not modify GP-200 logic while working on Practice Coach

Unless tests require a tiny compatibility fix, keep feature areas isolated.

### Do not change backend contracts casually

If API response shapes change:

* update backend tests
* update frontend types if needed
* update docs if needed
* keep backward compatibility when reasonable

---

## Branching Rules

Use feature branches unless the user explicitly says to work on `main`.

Recommended branch names:

* `feat/gp200-*`
* `chore/gp200-*`
* `feat/practice-coach-*`
* `fix/*`
* `docs/*`

If the user says “work directly on main,” confirm clean state first:

```bash
git checkout main
git pull origin main
git status
```

If there are uncommitted changes or conflicts, stop and report.

---

## Verification Commands

Backend tests:

```bash
PYTHONPATH=apps/backend python -m pytest apps/backend/tests -v
```

Frontend tests:

```bash
npm run test --prefix apps/frontend
```

Frontend lint:

```bash
npm run lint --prefix apps/frontend
```

Frontend build:

```bash
npm run build --prefix apps/frontend
```

Run frontend checks whenever frontend files changed.

Run backend tests whenever backend files changed.

If both changed, run all checks.

---

## Local Development Commands

From repo root, create and activate backend environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r apps/backend/requirements.txt
```

Run backend:

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

Note: opening `http://127.0.0.1:8000` may show:

```json
{"detail": "Not Found"}
```

That is normal if no root route exists.

Run frontend:

```bash
cd apps/frontend
npm install
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000 npm run dev
```

Frontend URL:

```text
http://127.0.0.1:3000
```

GP-200 page:

```text
http://127.0.0.1:3000/tone-maker/gp200
```

---

## Manual GP-200 API Test

With backend running:

```bash
curl -X POST http://127.0.0.1:8000/tone-maker/gp200 \
  -H "Content-Type: application/json" \
  -d '{
    "tone_goal": "metal tight chug heavy rhythm",
    "pickup_type": "humbucker bridge",
    "connection_mode": "direct_usb"
  }'
```

Expected response includes:

* `device: "Valeton"`
* `model: "GP-200"`
* `style`
* `tone_intent`
* `modules`
* `dial_in_instructions`
* `warnings`
* `valid`
* `errors`

---

## Manual Practice Coach API Test

If the Practice Coach backend is present locally, start backend and run:

```bash
curl -X POST http://127.0.0.1:8000/practice/analyze-audio \
  -F "audio_file=@practice.wav"
```

Current limitation:

* `.wav` only unless newer code explicitly supports more formats

Expected response includes:

* filename
* duration_seconds
* sample_rate
* tempo_bpm
* onset_count
* rms_energy_mean
* spectral_centroid_mean
* zero_crossing_rate_mean
* analysis_warnings
* valid
* errors
* practice_metrics, if the scoring branch has been merged

---

## Documentation Rules

Keep docs practical and readable.

Update docs when changing:

* API contracts
* run commands
* setup steps
* limitations
* verification behavior
* manually verified effect status

Important docs:

* `README.md`
* `docs/gp200_api_examples.md`
* `docs/gp200_backend_demo_status.md`
* `docs/gp200_verified_effect_intake_template.md`
* `docs/practice_coach_audio_analysis.md`, if present

---

## Coding Style Guidelines

Backend:

* Prefer deterministic, testable services.
* Keep route handlers thin.
* Put logic in service files.
* Add tests for new behavior.
* Use clear validation and error messages.
* Do not hide failures silently.

Frontend:

* Keep pages minimal unless asked to design.
* Use typed API clients.
* Show loading and error states for user actions.
* Avoid large styling changes unless asked.
* Do not redesign existing pages unless requested.

Tests:

* Use generated test audio/files when possible.
* Do not require external files for automated tests.
* Keep tests deterministic.
* Verify both success and error cases.

---

## Reporting Format After Work

When finished, report:

* branch name
* commit hash
* changed files
* tests run and results
* whether branch was pushed
* any limitations
* local URL or curl command to test, when relevant

If work could not be completed, report exactly what stopped progress.
