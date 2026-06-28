# CLAUDE.md

## Project Context

This repo is **GuitarLab AI**, a monorepo for electric guitar/music tools.

The project currently has two major directions:

1. **Valeton GP-200 Tone Maker**

   * User provides a tone goal, pickup type, and connection mode.
   * Backend generates a structured Valeton GP-200 patch.
   * Patch uses verified GP-200 effects where available.
   * Backend validates the patch and returns dial-in instructions.

2. **AI Guitar Practice Coach**

   * User uploads guitar audio.
   * Backend extracts measurable audio features.
   * Backend returns deterministic analysis and basic scoring.
   * More advanced feedback will come later.

The user wants the website design/UI to be done later through specific prompts. Do not redesign the UI unless explicitly asked.

---

## High-Level Architecture

```text
apps/
  backend/
    app/
      main.py
      tone_maker.py
      practice_coach.py
      services/
      devices/
    tests/

  frontend/
    src/
      app/
      lib/

docs/
README.md
```

Backend is FastAPI.

Frontend is Next.js TypeScript.

The project should be backend-first and test-driven.

---

## Main Principle

This project should not become a generic GPT wrapper.

Correct pattern:

```text
user input
  -> structured backend logic
  -> validation
  -> deterministic result
  -> optional future LLM explanation grounded in that result
```

Incorrect pattern:

```text
user input
  -> LLM guesses patch/coaching advice
  -> frontend displays it
```

LLMs and agents are not currently part of the MVP. Do not add them unless explicitly instructed.

---

## GP-200 Tone Maker Rules

The GP-200 Tone Maker is currently the most complete MVP.

It should remain device-specific to the **Valeton GP-200**.

The backend should use:

* tone intent matching
* style templates
* verified effect data
* seed effect data only as fallback
* connection-mode rules
* patch validation
* deterministic dial-in instructions

### Verified effects

Official GP-200 effect names must not be invented.

Only mark an effect as verified if it comes from a source such as:

* Valeton GP-200 manual
* GP-200 editor
* GP-200 export
* user-provided verified list

If an effect is verified:

```yaml
verified: true
official_effect_name: "..."
source: manual
```

If not verified:

```yaml
verified: false
source: seed_profile
```

Do not add official-looking names from memory, guesses, forums, or LLM output.

### Connection-mode behavior

Respect connection-mode rules:

```text
headphones/direct_usb:
  AMP on
  CAB on

guitar_amp_input:
  AMP off
  CAB off

fx_return:
  AMP on
  CAB off

four_cable_method:
  AMP off
  CAB off
  routing warning included
```

Do not change these rules casually.

---

## Practice Coach Rules

Practice Coach should be developed gradually.

Current/future layers:

1. Audio upload endpoint.
2. Audio feature extraction.
3. Deterministic practice metrics.
4. Later: pitch tracking.
5. Later: rhythm/timing accuracy against a reference.
6. Later: note correctness.
7. Later: UI.
8. Later: LLM explanation grounded in measured data.

Do not claim real pitch accuracy, timing accuracy, or note correctness unless it is implemented.

If the current metric is only a proxy, label it as a proxy.

Example:

```text
timing_activity_score is an onset/tempo activity proxy, not true rhythmic accuracy.
```

---

## UI Rules

Do not redesign the website unless specifically asked.

Avoid adding:

* landing pages
* dashboards
* design systems
* theme systems
* polished layouts
* big visual components
* marketing copy

Minimal frontend work is okay when needed to test backend features.

A minimal UI should:

* call the correct backend endpoint
* show loading state
* show error state
* display returned data
* keep styling simple

The user wants to personally direct the final website design later.

---

## Branching Instructions

Use a new branch unless the user explicitly says to work on `main`.

Before working:

```bash
git status
git branch --show-current
```

If working on main because the user requested it:

```bash
git checkout main
git pull origin main
git status
```

If there are uncommitted changes, conflicts, or uncertainty, stop and report.

Do not resolve conflicts implicitly.

---

## Setup

From repo root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r apps/backend/requirements.txt
```

If venv creation was interrupted:

```bash
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r apps/backend/requirements.txt
```

Run backend:

```bash
PYTHONPATH=apps/backend python -m uvicorn app.main:app --reload --app-dir apps/backend
```

Run frontend:

```bash
cd apps/frontend
npm install
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000 npm run dev
```

---

## Testing

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

Run the relevant tests for any changed area.

If backend and frontend both changed, run all checks.

---

## Manual GP-200 Test

Start backend, then run:

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

```text
device: Valeton
model: GP-200
style
tone_intent
modules
dial_in_instructions
warnings
valid
errors
```

Frontend route:

```text
http://127.0.0.1:3000/tone-maker/gp200
```

---

## Manual Practice Coach Test

If practice endpoint exists locally:

```bash
curl -X POST http://127.0.0.1:8000/practice/analyze-audio \
  -F "audio_file=@practice.wav"
```

Expected response includes:

```text
filename
duration_seconds
sample_rate
tempo_bpm
onset_count
rms_energy_mean
spectral_centroid_mean
zero_crossing_rate_mean
analysis_warnings
valid
errors
practice_metrics, if scoring is present
```

Current expected limitation:

```text
.wav only
```

unless newer code explicitly adds more formats.

---

## Documentation Expectations

Keep docs updated when changing functionality.

Important docs:

```text
README.md
docs/gp200_api_examples.md
docs/gp200_backend_demo_status.md
docs/gp200_verified_effect_intake_template.md
docs/practice_coach_audio_analysis.md
```

Docs should explain:

* how to run locally
* how to test manually
* what is implemented
* what is intentionally not implemented
* limitations
* no LLM/agent status
* verified vs seed effect status

---

## Commit/Report Format

After completing work, report:

```text
Branch:
Commit:
Changed files:
Tests run:
Results:
Pushed: yes/no
Manual test:
Limitations:
```

If something blocks progress, stop and report the blocker clearly.

---

## Do Not Add Unless Explicitly Asked

Do not add:

* LLM calls
* OpenAI agents
* final UI design
* landing page
* dashboard
* theme system
* `.prst` export
* riff-to-tab
* tab generation
* pitch scoring
* fake official GP-200 effects
* unrelated refactors
* large dependency changes
