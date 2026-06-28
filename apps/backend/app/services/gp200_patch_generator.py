from copy import deepcopy
from functools import lru_cache
from typing import Any

import yaml

from app.services.gp200_patch_validator import (
    GP200_DATA_DIR,
    load_connection_rules,
    load_gp200_profile,
    validate_gp200_patch,
)


@lru_cache
def load_style_templates() -> dict[str, Any]:
    with (GP200_DATA_DIR / "style_templates.yaml").open() as file:
        return yaml.safe_load(file)["styles"]


STYLE_KEYWORDS = {
    style_name: tuple(template["keywords"])
    for style_name, template in load_style_templates().items()
}
DEFAULT_STYLE = "clean_indie"
PICKUP_ADJUSTMENT_EXPLANATIONS = {
    "humbucker": (
        "Humbucker input detected; keep high-gain patches controlled with noise "
        "reduction and avoid excessive low-end buildup."
    ),
    "single_coil": (
        "Single-coil input detected; preserve brightness and watch for noise on "
        "higher-gain patches."
    ),
    "default": "No specific pickup adjustment applied.",
}
CONNECTION_RULE_EXPLANATIONS = {
    "headphones": "Headphones mode keeps AMP and CAB enabled for full-range output.",
    "direct_usb": (
        "Direct USB mode keeps AMP and CAB enabled for recording/full-range playback."
    ),
    "guitar_amp_input": (
        "Guitar amp input mode disables AMP and CAB to avoid stacking modeled "
        "amp/cab tone into a real amp input."
    ),
    "fx_return": (
        "FX return mode keeps AMP enabled and disables CAB for use into a power "
        "amp/speaker section."
    ),
    "four_cable_method": (
        "Four-cable method disables AMP and CAB and expects routing around the "
        "real amp preamp."
    ),
}


def generate_gp200_patch(
    tone_goal: str,
    pickup_type: str,
    connection_mode: str,
) -> dict[str, Any]:
    mode = normalize_connection_mode(connection_mode)
    profile = load_gp200_profile()
    connection_rules = load_connection_rules()
    tone_intent = build_tone_intent(tone_goal, pickup_type, mode)
    template_name = tone_intent["selected_style"]
    template = load_style_templates()[template_name]

    modules = deepcopy(template["modules"])
    warnings: list[str] = []
    apply_pickup_adjustments(modules, pickup_type, warnings)
    apply_connection_rules(modules, mode, connection_rules, warnings)

    patch = {
        "device": profile["device"],
        "model": profile["model"],
        "style": template_name,
        "tone_goal": tone_goal,
        "pickup_type": pickup_type,
        "connection_mode": mode,
        "signal_chain": template["signal_chain"],
        "modules": modules,
        "warnings": dedupe(warnings),
        "summary": build_summary(template_name, pickup_type, mode),
        "tone_intent": tone_intent,
        "valid": True,
        "errors": [],
    }

    result = validate_gp200_patch(patch)
    patch["valid"] = result.valid
    patch["warnings"] = dedupe([*patch["warnings"], *result.warnings])
    patch["errors"] = result.errors
    return patch


def select_style_template(tone_goal: str) -> str:
    return analyze_style_match(tone_goal)["selected_style"]


def build_tone_intent(
    tone_goal: str,
    pickup_type: str,
    connection_mode: str,
) -> dict[str, Any]:
    style_match = analyze_style_match(tone_goal)
    return {
        **style_match,
        "pickup_adjustments": explain_pickup_adjustments(pickup_type),
        "connection_rules_applied": [CONNECTION_RULE_EXPLANATIONS[connection_mode]],
    }


def analyze_style_match(tone_goal: str) -> dict[str, Any]:
    goal = tone_goal.lower()
    selected_style = DEFAULT_STYLE
    matched_keywords: list[str] = []

    for style_name, keywords in STYLE_KEYWORDS.items():
        style_matches = [keyword for keyword in keywords if keyword in goal]
        if len(style_matches) > len(matched_keywords):
            selected_style = style_name
            matched_keywords = style_matches

    fallback_used = not matched_keywords
    if fallback_used:
        selected_style = DEFAULT_STYLE

    return {
        "selected_style": selected_style,
        "matched_keywords": matched_keywords,
        "fallback_used": fallback_used,
        "confidence": determine_confidence(len(matched_keywords), fallback_used),
    }


def determine_confidence(match_count: int, fallback_used: bool) -> str:
    if fallback_used:
        return "low"
    if match_count >= 2:
        return "high"
    return "medium"


def explain_pickup_adjustments(pickup_type: str) -> list[str]:
    pickup = pickup_type.lower()
    if "humbucker" in pickup:
        return [PICKUP_ADJUSTMENT_EXPLANATIONS["humbucker"]]
    if "single-coil" in pickup or "single coil" in pickup or "single coils" in pickup:
        return [PICKUP_ADJUSTMENT_EXPLANATIONS["single_coil"]]
    return [PICKUP_ADJUSTMENT_EXPLANATIONS["default"]]


def apply_pickup_adjustments(
    modules: dict[str, dict[str, Any]],
    pickup_type: str,
    warnings: list[str],
) -> None:
    pickup = pickup_type.lower()
    amp_parameters = modules["AMP"]["parameters"]
    dst_parameters = modules["DST"]["parameters"]

    if "single" in pickup:
        amp_parameters["gain"] = clamp(amp_parameters["gain"] + 6)
        dst_parameters["level"] = clamp(dst_parameters.get("level", 50) + 4)
        warnings.append("Single coil pickup detected: added gain and drive level.")
    elif "humbucker" in pickup:
        amp_parameters["gain"] = clamp(amp_parameters["gain"] - 2)
        warnings.append("Humbucker pickup detected: trimmed amp gain slightly.")
    elif "p90" in pickup or "p-90" in pickup:
        amp_parameters["mid"] = clamp(amp_parameters.get("mid", 50) + 4)
        warnings.append("P-90 pickup detected: emphasized midrange.")


def apply_connection_rules(
    modules: dict[str, dict[str, Any]],
    connection_mode: str,
    connection_rules: dict[str, Any],
    warnings: list[str],
) -> None:
    rule = connection_rules[connection_mode]
    modules["AMP"]["enabled"] = rule["amp_enabled"]
    modules["CAB"]["enabled"] = rule["cab_enabled"]
    warnings.extend(rule.get("warnings", []))


def build_summary(style_name: str, pickup_type: str, connection_mode: str) -> str:
    readable_style = style_name.replace("_", " ")
    readable_mode = connection_mode.replace("_", " ")
    return f"{readable_style.title()} GP-200 patch for {pickup_type} via {readable_mode}."


def normalize_connection_mode(connection_mode: str) -> str:
    return getattr(connection_mode, "value", str(connection_mode))


def clamp(value: int, min_value: int = 0, max_value: int = 100) -> int:
    return max(min_value, min(max_value, value))


def dedupe(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))
