# GP-200 Backend Demo Status

## Current Features

- FastAPI endpoint: `POST /tone-maker/gp200`.
- Typed request and response models for tone goal, pickup type, connection mode, patch data, warnings, validation errors, and `tone_intent`.
- Deterministic style selection for `grunge`, `metal`, `blues`, `shoegaze`, `punk`, `classic_rock`, `clean_indie`, and `funk`.
- Rule-based connection handling for `headphones`, `direct_usb`, `guitar_amp_input`, `fx_return`, and `four_cable_method`.
- Backend patch validation for modules, effects, parameters, parameter ranges, and AMP/CAB state.
- Demo request fixtures in `apps/backend/tests/fixtures/gp200_demo_requests.json`.

## Current Limitations

- Effects are still project seed-profile names, not manually verified official Valeton GP-200 effect names.
- Parameter values are deterministic placeholders for backend/API validation and demo use.
- Patch output is JSON only.

## Intentionally Not Implemented Yet

- LLM calls or agents.
- Audio upload, riff-to-tab, or practice coach features.
- `.prst` export.
- Complete official GP-200 effect catalog.
- Frontend redesign, dashboard, landing page, or theme system.

## Demo Fixtures

- `grunge_humbucker_headphones`
- `metal_direct_usb`
- `funk_four_cable`
- `blues_fx_return`
- `unknown_fallback`

## Run Tests

From the repo root:

```bash
PYTHONPATH=apps/backend .venv/bin/pytest apps/backend/tests -v
```
