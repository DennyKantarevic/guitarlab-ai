# GuitarLab AI Demo Script

Use this as a 2-3 minute walkthrough. Keep the demo honest: this project is a structured guitar tools MVP, not a full song-recognition or AI-agent product.

## Before the Demo

Start the backend:

```bash
source .venv/bin/activate
PYTHONPATH=apps/backend python -m uvicorn app.main:app --reload --app-dir apps/backend
```

Start the frontend:

```bash
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000 npm run dev --prefix apps/frontend
```

Open:

```text
http://localhost:3000
```

Have a short `.wav` guitar recording ready for the Practice Coach.

## Opening

"GuitarLab AI is a guitar-focused practice and tone assistant. The idea is to build useful, explainable music tools first: deterministic audio analysis for practice feedback, and structured patch generation for a real multi-effects device."

"It is not a generic GPT wrapper. The backend returns measured audio features, validated patch data, warnings, and deterministic explanations."

## Practice Coach Walkthrough

Open:

```text
http://localhost:3000/practice-coach
```

Say:

"The Practice Coach takes a `.wav` guitar recording. I can tell it what I am practicing, upload a take, and get a score, focused feedback, reference comparisons, and local progress history."

Set:

```text
Practice focus: Timing and rhythm
Goal: Eighth-note alternate picking
```

Use one reference format. For notes:

```text
A4 B4 C5 D5
```

Or for tab:

```text
e|----------------|
B|----------------|
G|----------------|
D|----------------|
A|-----0-2-3------|
E|-0-3------------|
```

Or for chords:

```text
G C D Em
```

Or for strumming:

```text
D D U U D U
```

Upload the `.wav` file and click **Analyze**.

Point out:

* The score is a practice snapshot, not a grade for musical correctness.
* Coach feedback is written from measured values and the selected practice focus.
* Reference notes and tab compare detected note events to a user-provided exercise.
* Chord comparison checks chord-tone coverage, not full chord recognition.
* Strumming comparison checks attack activity, not actual stroke direction.
* Practice history is stored locally in the browser. Audio files are not saved.
* Technical details are collapsed for transparency without making the main view too technical.

## GP-200 Tone Maker Walkthrough

Open:

```text
http://localhost:3000/tone-maker/gp200
```

Say:

"The GP-200 Tone Maker is for the Valeton GP-200. Instead of asking a model to invent settings, it uses deterministic backend logic, style templates, connection rules, and validated device profile data."

Enter:

```text
Tone goal: tight metal rhythm
Pickup type: humbucker bridge
Connection mode: Direct USB
```

Click **Generate patch**.

Point out:

* The selected style and tone intent explain why the patch was chosen.
* AMP/CAB behavior follows the selected connection mode.
* The response includes module settings, warnings, validation, and dial-in instructions.
* The user still manually dials settings into the GP-200. Device export is not implemented yet.

## What Not to Claim

Do not claim:

* Full song recognition.
* Copyrighted tab, chord, or strumming lookup.
* Perfect note correctness.
* Exact rhythm scoring.
* Upstroke/downstroke detection.
* Full polyphonic chord recognition.
* Real-time microphone recording.
* GP-200 `.prst` export/import.
* LLM or agent behavior.

## Closing

"The current project is an MVP, but the important part is the architecture: structured inputs, deterministic backend logic, explainable outputs, and honest limitations. LLM or agent features could be added later, but they should operate around this structured data rather than replacing it with unsupported guesses."
