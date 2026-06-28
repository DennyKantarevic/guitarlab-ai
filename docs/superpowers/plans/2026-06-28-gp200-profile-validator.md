# GP-200 Profile Validator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the GP-200 placeholder response internals with backend device profile, connection rules, style templates, patch generation, and validation while keeping the existing API stable.

**Architecture:** Add YAML-backed GP-200 device data under `apps/backend/app/devices/gp200`. Add focused backend services for deterministic patch generation and validation, then update the existing FastAPI route to use those services.

**Tech Stack:** FastAPI, Pydantic, PyYAML, pytest.

---

### Task 1: Backend Tests

**Files:**
- Modify: `apps/backend/tests/test_gp200_tone_maker.py`
- Create: `apps/backend/tests/test_gp200_patch_generator.py`
- Create: `apps/backend/tests/test_gp200_patch_validator.py`

- [ ] Write failing API tests for all connection modes.
- [ ] Write failing generator tests for every style template.
- [ ] Write failing validator tests for unknown modules, effects, parameters, out-of-range values, missing fields, and AMP/CAB rule mismatches.

### Task 2: Device Data

**Files:**
- Create: `apps/backend/app/devices/gp200/gp200_profile.yaml`
- Create: `apps/backend/app/devices/gp200/connection_rules.yaml`
- Create: `apps/backend/app/devices/gp200/style_templates.yaml`

- [ ] Add placeholder-valid GP-200 modules, effect names, and parameter ranges.
- [ ] Add connection mode AMP/CAB rules and warnings.
- [ ] Add deterministic style templates for grunge, metal, blues, shoegaze, punk, classic_rock, clean_indie, and funk.

### Task 3: Services And Route

**Files:**
- Create: `apps/backend/app/services/gp200_patch_generator.py`
- Create: `apps/backend/app/services/gp200_patch_validator.py`
- Modify: `apps/backend/app/tone_maker.py`
- Modify: `apps/backend/app/main.py`
- Modify: `apps/backend/requirements.txt`

- [ ] Load YAML device data.
- [ ] Generate GP-200 patches from tone goal, pickup type, and connection mode.
- [ ] Validate generated patches and return `valid`, `warnings`, and `errors`.
- [ ] Preserve current FastAPI request fields and response fields, adding only compatible fields needed for validator output and summary.

### Task 4: Verification

**Files:**
- No frontend changes expected.

- [ ] Run backend tests.
- [ ] Run frontend tests/lint/build only if frontend files changed.
- [ ] Report changed files, tests, API example, and frontend changes.
