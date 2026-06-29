from typing import Any, Mapping


def build_coach_feedback(
    *,
    analysis: Mapping[str, Any],
    practice_metrics: Mapping[str, Any],
    recording_quality: Mapping[str, Any],
    segment_analysis: list[Mapping[str, Any]],
) -> dict[str, Any]:
    quality_level = recording_quality["quality_level"]
    energy_level = practice_metrics["energy_level"]
    brightness_level = practice_metrics["brightness_level"]
    attack_activity = practice_metrics["attack_activity"]
    segment_intensity_changes = has_large_segment_intensity_changes(
        segment_analysis
    )

    strengths: list[str] = []
    focus_areas: list[str] = []
    next_steps: list[str] = []

    if quality_level == "good":
        strengths.append("The recording quality is clear enough for this analysis.")
    elif quality_level == "usable":
        strengths.append("The recording is usable for basic audio feedback.")
    else:
        focus_areas.append("Improve the recording setup before judging the playing.")

    if energy_level != "low":
        strengths.append("The input level is strong enough to measure reliably.")
    else:
        focus_areas.append("The recording level is very quiet.")
        next_steps.append(
            "Increase input gain slightly or record closer to the source."
        )

    if attack_activity == "moderate":
        strengths.append("The note attacks are present without being overly dense.")
    elif attack_activity == "busy":
        focus_areas.append("The note attacks are dense across the clip.")
        next_steps.append(
            "Practice the phrase slower with a metronome to keep note attacks controlled."
        )
    else:
        focus_areas.append("The recording has sparse note attacks.")
        next_steps.append(
            "Record a longer phrase or scale run for more useful analysis."
        )

    if brightness_level == "bright":
        focus_areas.append("The tone is very bright.")
        next_steps.append(
            "Reduce treble or pick closer to the neck if the tone feels harsh."
        )

    for warning in recording_quality["warnings"]:
        if warning not in focus_areas:
            focus_areas.append(warning)

    if segment_intensity_changes:
        focus_areas.append("Playing intensity changes across the clip.")
        next_steps.append(
            "Try keeping your picking intensity more consistent between sections."
        )

    if not next_steps:
        next_steps.append(
            "Record another take at the same settings and compare the measured scores."
        )

    if not strengths:
        strengths.append("The upload was processed successfully.")

    summary = (
        f"Analyzed {analysis['duration_seconds']:.2f} seconds of audio. "
        f"Recording quality is {quality_level}, attack activity is {attack_activity}, "
        f"and brightness is {brightness_level}."
    )

    return {
        "summary": summary,
        "strengths": strengths,
        "focus_areas": focus_areas,
        "next_steps": dedupe(next_steps),
    }


def has_large_segment_intensity_changes(
    segment_analysis: list[Mapping[str, Any]],
) -> bool:
    if len(segment_analysis) < 2:
        return False

    rms_values = [float(segment["rms_energy_mean"]) for segment in segment_analysis]
    return max(rms_values) - min(rms_values) > 0.08


def dedupe(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))
