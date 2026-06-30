import re
from typing import Any, Sequence

import numpy as np


MAX_STRUMMING_STROKES = 32
SUPPORTED_STROKES = {"D", "U", "X"}


def parse_expected_strumming_pattern(raw: str | None) -> dict[str, Any]:
    normalized_raw = (raw or "").strip()
    if not normalized_raw:
        return {
            "expected_pattern_raw": None,
            "strokes": [],
            "valid": True,
            "warnings": [],
        }

    strokes: list[str] = []
    warnings: list[str] = []
    tokens = [token for token in re.split(r"[\s,\-]+", normalized_raw) if token]

    for token in tokens:
        stroke = token.strip().upper()
        if stroke not in SUPPORTED_STROKES:
            warnings.append(
                f"Unsupported strumming symbol '{token}'. Use D, U, or X separated by spaces, commas, hyphens, or new lines."
            )
            continue
        strokes.append(stroke)

    if len(strokes) > MAX_STRUMMING_STROKES:
        strokes = strokes[:MAX_STRUMMING_STROKES]
        warnings.append(
            f"Only the first {MAX_STRUMMING_STROKES} strumming strokes were compared."
        )

    if not strokes:
        warnings.append("No supported strumming strokes were provided.")

    return {
        "expected_pattern_raw": normalized_raw,
        "strokes": strokes,
        "valid": len(warnings) == 0,
        "warnings": warnings,
    }


def compare_strumming_pattern(
    strumming_pattern: dict[str, Any],
    onset_times_seconds: Sequence[float],
    onset_count: int,
) -> dict[str, Any]:
    if strumming_pattern.get("expected_pattern_raw") is None:
        return build_empty_strumming_comparison(
            enabled=False,
            valid=True,
            summary="No strumming pattern was provided.",
            warnings=[],
        )

    strokes = list(strumming_pattern.get("strokes") or [])
    warnings = list(strumming_pattern.get("warnings") or [])
    valid = bool(strumming_pattern.get("valid", False))
    expected_count = len(strokes)

    if expected_count == 0:
        return build_empty_strumming_comparison(
            enabled=True,
            valid=False,
            summary=(
                "The strumming pattern could not be compared because no supported D, U, or X strokes were provided. "
                "This checks approximate attack activity only, not upstroke/downstroke direction."
            ),
            warnings=warnings,
            detected_attack_count=onset_count,
        )

    count_difference = int(onset_count) - expected_count
    attack_match_level = classify_attack_match(
        detected_attack_count=int(onset_count),
        expected_stroke_count=expected_count,
    )
    spacing_level = classify_spacing(onset_times_seconds)

    return {
        "enabled": True,
        "valid": valid,
        "expected_stroke_count": expected_count,
        "detected_attack_count": int(onset_count),
        "count_difference": count_difference,
        "attack_match_level": attack_match_level,
        "spacing_level": spacing_level,
        "summary": build_strumming_summary(
            valid=valid,
            expected_stroke_count=expected_count,
            detected_attack_count=int(onset_count),
            attack_match_level=attack_match_level,
            spacing_level=spacing_level,
        ),
        "warnings": warnings,
    }


def classify_attack_match(
    *,
    detected_attack_count: int,
    expected_stroke_count: int,
) -> str:
    difference = detected_attack_count - expected_stroke_count
    absolute_difference = abs(difference)
    if absolute_difference <= 1:
        return "good"
    if absolute_difference == 2:
        return "close"
    if difference <= -3:
        return "low"
    if difference >= 3:
        return "too_many"
    return "unavailable"


def classify_spacing(onset_times_seconds: Sequence[float]) -> str:
    if len(onset_times_seconds) < 3:
        return "unavailable"

    intervals = np.diff(np.array(onset_times_seconds, dtype=float))
    if intervals.size < 2:
        return "unavailable"

    mean_interval = float(np.mean(intervals))
    if not np.isfinite(mean_interval) or mean_interval <= 0:
        return "unavailable"

    coefficient_of_variation = float(np.std(intervals) / mean_interval)
    if coefficient_of_variation <= 0.25:
        return "steady"
    if coefficient_of_variation <= 0.60:
        return "somewhat_uneven"
    return "uneven"


def build_strumming_summary(
    *,
    valid: bool,
    expected_stroke_count: int,
    detected_attack_count: int,
    attack_match_level: str,
    spacing_level: str,
) -> str:
    prefix = (
        "The strumming pattern includes unsupported symbols, so this comparison is incomplete. "
        if not valid
        else ""
    )

    if attack_match_level == "good":
        summary = (
            "The recording had about the right number of clear attacks for the expected strumming pattern."
        )
    elif attack_match_level == "close":
        summary = (
            "The recording had a close number of attack events for the expected strumming pattern."
        )
    elif attack_match_level == "low":
        summary = (
            f"The coach detected fewer attack events than the expected {expected_stroke_count}-stroke pattern. "
            "Try slowing down and making each stroke clearer."
        )
    elif attack_match_level == "too_many":
        summary = (
            f"The coach detected more attack events than the expected {expected_stroke_count}-stroke pattern. "
            "Try simplifying the motion and making each intended stroke clear."
        )
    else:
        summary = (
            "The coach could not detect enough attack events to compare against the expected strumming pattern."
        )

    if spacing_level == "somewhat_uneven":
        summary += (
            " The attack spacing looked somewhat uneven, so practice it slowly with a metronome."
        )
    elif spacing_level == "uneven":
        summary += (
            " The attack spacing looked uneven, so slow the pattern down and keep the stroke starts even."
        )
    elif spacing_level == "steady" and detected_attack_count >= 3:
        summary += " The attack spacing looked steady for this simple check."

    return (
        f"{prefix}{summary} "
        "This checks approximate attack activity only, not upstroke/downstroke direction."
    )


def build_empty_strumming_comparison(
    *,
    enabled: bool,
    valid: bool,
    summary: str,
    warnings: list[str],
    detected_attack_count: int = 0,
) -> dict[str, Any]:
    return {
        "enabled": enabled,
        "valid": valid,
        "expected_stroke_count": 0,
        "detected_attack_count": int(detected_attack_count),
        "count_difference": None,
        "attack_match_level": "unavailable",
        "spacing_level": "unavailable",
        "summary": summary,
        "warnings": warnings,
    }
