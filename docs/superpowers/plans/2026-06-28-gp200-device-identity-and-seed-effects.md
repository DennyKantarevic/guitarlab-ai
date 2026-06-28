# GP-200 Device Identity And Seed Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the GP-200 backend identity to Valeton GP-200 and replace copied placeholder effect names with a small seed profile that the generator and validator use consistently.

**Architecture:** Keep the existing FastAPI endpoint and frontend form behavior stable. Update YAML device data, style templates, generator tests, validator tests, and only make frontend fixture/type edits if required by the existing API contract.

**Tech Stack:** FastAPI, Pydantic, PyYAML, pytest, Vitest only if frontend files change.

---

### Task 1: Failing Tests And Search

**Files:**
- Modify: `apps/backend/tests/test_gp200_patch_generator.py`
- Modify: `apps/backend/tests/test_gp200_patch_validator.py`
- Modify: `apps/backend/tests/test_gp200_tone_maker.py`

- [ ] Search for copied non-Valeton references.
- [ ] Add backend assertions for `device == "Valeton"` and `model == "GP-200"`.
- [ ] Add backend assertions that generated patches contain no copied non-Valeton identifiers.
- [ ] Add backend assertions that all generated effects exist in `gp200_profile.yaml`.

### Task 2: Seed Profile And Templates

**Files:**
- Modify: `apps/backend/app/devices/gp200/gp200_profile.yaml`
- Modify: `apps/backend/app/devices/gp200/style_templates.yaml`

- [ ] Correct identity to Valeton GP-200.
- [ ] Add a note that effect names are a small project seed set, not the full official GP-200 list.
- [ ] Replace template effects with the seed names: compressor, auto_wah, overdrive, distortion, fuzz, clean_amp, driven_amp, high_gain_amp, matched_cab, parametric_eq, noise_gate, chorus, phaser, analog_delay, digital_delay, room_reverb, plate_reverb, volume.

### Task 3: Verification

**Files:**
- Frontend fixture files only if existing tests require identity alignment.

- [ ] Run backend tests.
- [ ] If frontend files changed, run frontend tests, lint, and build.
- [ ] Run final repo search for forbidden references and report results.
