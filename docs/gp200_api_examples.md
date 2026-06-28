# GP-200 Tone Maker API Examples

The GP-200 tone maker endpoint returns deterministic, rule-based Valeton GP-200 patch JSON. It does not call an LLM yet.

Generated patches prefer manually verified Valeton GP-200 effect names where they are available. The profile still contains seed-profile placeholders for effects that have not been manually verified yet.

## Behavior Notes

- Effects marked `verified: true` in the backend profile have been manually checked against a source.
- Seed-profile effects are internal placeholders and are not official verified GP-200 effect names.
- Connection mode rules control AMP/CAB enabled state.
- Dial-in instructions are generated deterministically from the validated patch JSON and connection mode.

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
- `warnings`: Setup, pickup, and validation warnings. Seed-profile effects add an unverified-effect warning only when a generated patch uses one.
- `summary`: Short human-readable patch summary.
- `tone_intent`: Deterministic explanation of style selection and applied rules.
- `dial_in_instructions`: Deterministic GP-200 setup steps generated from the validated patch JSON.
- `valid`: Whether the generated patch passed backend validation.
- `errors`: Validation errors. Demo requests should return an empty list.

## Connection Mode Rules

- `headphones`: AMP on, CAB on.
- `direct_usb`: AMP on, CAB on.
- `guitar_amp_input`: AMP off, CAB off.
- `fx_return`: AMP on, CAB off.
- `four_cable_method`: AMP off, CAB off, with routing warnings.

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
      "effect": "amp_mess_dualm",
      "parameters": {
        "gain": 70,
        "presence": 58,
        "volume": 62,
        "bass": 52,
        "middle": 38,
        "treble": 62
      }
    },
    "CAB": {
      "enabled": true,
      "effect": "cab_uk_ld",
      "parameters": {
        "volume": 52,
        "low_cut": 90,
        "hi_cut": 72
      }
    }
  },
  "dial_in_instructions": [
    "Create a new patch on the Valeton GP-200.",
    "Use the Metal style as the patch starting point.",
    "Set the connection mode for this patch to direct USB recording/full-range playback.",
    "Set the signal chain to: PRE > WAH > DST > AMP > NR > CAB > EQ > MOD > DLY > RVB > VOL.",
    "Enable AMP and select Mess DualM.",
    "Enable CAB and select UK LD.",
    "Keep AMP and CAB enabled for full-range output.",
    "Start with the GP-200 output level low, then raise it after confirming the patch is not too loud."
  ],
  "warnings": [
    "Humbucker pickup detected: trimmed amp gain slightly."
  ],
  "valid": true,
  "errors": []
}
```
