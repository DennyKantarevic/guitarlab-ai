# GP-200 Tone Maker API Examples

The GP-200 tone maker endpoint returns deterministic, rule-based Valeton GP-200 patch JSON. It does not call an LLM yet.

Current effect names are seed-profile names for the project. They are not yet manually verified official Valeton GP-200 effect names.

## Endpoint

`POST /tone-maker/gp200`

Default local URL:

```bash
http://127.0.0.1:8000/tone-maker/gp200
```

## Request Schema

```json
{
  "tone_goal": "string",
  "pickup_type": "string",
  "connection_mode": "headphones | direct_usb | guitar_amp_input | fx_return | four_cable_method"
}
```

## Response Fields

- `device`: Device maker. Expected value: `Valeton`.
- `model`: Device model. Expected value: `GP-200`.
- `style`: Selected style template.
- `tone_goal`: Original request tone goal.
- `pickup_type`: Original request pickup type.
- `connection_mode`: Requested output/routing mode.
- `signal_chain`: Ordered GP-200 module list.
- `modules`: Module settings keyed by module name, including `enabled`, `effect`, and `parameters`.
- `warnings`: Setup and validation warnings. Seed-profile effects currently add an unverified-effect warning.
- `summary`: Short human-readable patch summary.
- `tone_intent`: Deterministic explanation of style selection and applied rules.
- `valid`: Whether the generated patch passed backend validation.
- `errors`: Validation errors. Demo requests should return an empty list.

## Demo Requests

### grunge_humbucker_headphones

```json
{
  "tone_goal": "90s grunge like Nirvana but heavier",
  "pickup_type": "humbucker bridge",
  "connection_mode": "headphones"
}
```

### metal_direct_usb

```json
{
  "tone_goal": "metal tight chug heavy rhythm",
  "pickup_type": "humbucker bridge",
  "connection_mode": "direct_usb"
}
```

### funk_four_cable

```json
{
  "tone_goal": "funk clean quack percussive",
  "pickup_type": "single coil bridge",
  "connection_mode": "four_cable_method"
}
```

### blues_fx_return

```json
{
  "tone_goal": "warm blues breakup overdrive",
  "pickup_type": "single coil neck",
  "connection_mode": "fx_return"
}
```

### unknown_fallback

```json
{
  "tone_goal": "smooth glassy experimental tone",
  "pickup_type": "unknown",
  "connection_mode": "headphones"
}
```

## Shortened Example Response

Request:

```bash
curl -X POST http://127.0.0.1:8000/tone-maker/gp200 \
  -H "Content-Type: application/json" \
  -d '{
    "tone_goal": "metal tight chug heavy rhythm",
    "pickup_type": "humbucker bridge",
    "connection_mode": "direct_usb"
  }'
```

Shortened response:

```json
{
  "device": "Valeton",
  "model": "GP-200",
  "style": "metal",
  "tone_intent": {
    "selected_style": "metal",
    "matched_keywords": ["metal", "tight", "chug", "heavy"],
    "fallback_used": false,
    "pickup_adjustments": [
      "Humbucker input detected; keep high-gain patches controlled with noise reduction and avoid excessive low-end buildup."
    ],
    "connection_rules_applied": [
      "Direct USB mode keeps AMP and CAB enabled for recording/full-range playback."
    ],
    "confidence": "high"
  },
  "modules": {
    "AMP": {
      "enabled": true,
      "effect": "high_gain_amp",
      "parameters": {
        "gain": 70,
        "bass": 52,
        "mid": 38,
        "treble": 62,
        "master": 62
      }
    },
    "CAB": {
      "enabled": true,
      "effect": "matched_cab",
      "parameters": {
        "mic_position": 54,
        "low_cut_hz": 90,
        "high_cut_hz": 7200
      }
    }
  },
  "warnings": [
    "Humbucker pickup detected: trimmed amp gain slightly.",
    "This patch uses seed-profile effect names that have not yet been manually verified against the official Valeton GP-200 effect list."
  ],
  "valid": true,
  "errors": []
}
```
