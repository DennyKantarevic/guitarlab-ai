# GP-200 Verified Effect Intake Template

Use this template when manually adding verified Valeton GP-200 effect names to the backend profile.

Seed-profile effects are internal placeholders only. Do not treat them as official GP-200 names until a source has been manually checked.

## Rules

- Only mark `verified: true` after checking the GP-200 manual, GP-200 editor, or a real GP-200 export.
- Do not use LLM-generated names as verified effects.
- Preserve exact spelling and capitalization from the source in `official_effect_name`.
- Use `internal_id` as the stable code identifier used by generators, validators, and templates.
- If parameter ranges are unknown, keep conservative `0-100` ranges and note that parameters are pending verification.
- Keep seed/internal effect names marked `verified: false` until a source has been checked manually.

## Intake Table

| module | official_effect_name | internal_id | display_name | category | source | source_detail | verified_by | verification_date | parameters_observed | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |  |  |  |

## Source Values

- `manual`: GP-200 manual.
- `editor_export`: GP-200 editor or exported patch data.
- `user_verified`: Manually checked by a project user against a real device or source.
- `unknown`: Source is not yet clear; do not mark the effect verified.
- `seed_profile`: Internal seed effect; do not mark the effect verified.

## Profile Entry Checklist

- `official_effect_name` matches the source exactly.
- `internal_id` is stable and code-friendly.
- `display_name` is suitable for API/UI display.
- `verified` is `true` only after manual verification.
- `source` identifies how the effect was checked.
- `source_note` records enough detail to re-check the source later.
- Parameters and ranges are either source-verified or clearly noted as pending verification.
