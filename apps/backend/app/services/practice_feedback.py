from typing import Any, Mapping


def build_coach_feedback(
    *,
    analysis: Mapping[str, Any],
    practice_metrics: Mapping[str, Any],
    recording_quality: Mapping[str, Any],
    segment_analysis: list[Mapping[str, Any]],
    practice_context: Mapping[str, Any] | None = None,
    pitch_analysis: Mapping[str, Any] | None = None,
    note_events: list[Mapping[str, Any]] | None = None,
) -> dict[str, Any]:
    quality_level = recording_quality["quality_level"]
    overall_score = int(practice_metrics["overall_score"])
    energy_level = practice_metrics["energy_level"]
    brightness_level = practice_metrics["brightness_level"]
    attack_activity = practice_metrics["attack_activity"]
    segment_intensity_changes = has_large_segment_intensity_changes(
        segment_analysis
    )

    what_went_well: list[str] = []
    work_on: list[str] = []
    next_practice_steps: list[str] = []
    coach_notes: list[str] = []

    if quality_level == "good":
        what_went_well.append(
            "Your take has a clear enough signal to analyze, so the feedback can focus on the playing."
        )
    elif quality_level == "usable":
        what_went_well.append(
            "The recording is usable for basic feedback, even though the setup could still be cleaner."
        )
    else:
        work_on.append(
            "Improve the recording setup first so the coach can judge the take more reliably."
        )
        next_practice_steps.append(
            "Raise the input level a little or record closer to the source before judging the playing."
        )

    if energy_level != "low":
        what_went_well.append(
            "The input level is strong enough for the note attacks to come through."
        )
    else:
        work_on.append(
            "The recording is quiet, which can hide pick attack and make the feedback less useful."
        )
        next_practice_steps.append(
            "Increase input gain slightly or record closer to the source."
        )

    if attack_activity == "moderate":
        what_went_well.append(
            "The note attacks are coming through consistently without feeling overcrowded."
        )
    elif attack_activity == "busy":
        work_on.append(
            "The phrase is pretty busy, so the next practice goal should be control rather than speed."
        )
        next_practice_steps.append(
            "Practice the same idea slower with a metronome and make each note start cleanly."
        )
    else:
        work_on.append(
            "The recording has only a few clear note starts, so there is not much phrase activity to coach yet."
        )
        next_practice_steps.append(
            "Record a longer phrase or scale run with clear note separation."
        )

    if brightness_level == "bright":
        work_on.append(
            "The tone is on the bright side, which can make pick noise stand out more."
        )
        next_practice_steps.append(
            "Reduce treble or pick closer to the neck if the tone feels harsh."
        )
    elif brightness_level == "balanced":
        what_went_well.append(
            "The tone sits in a balanced range for this basic analysis."
        )

    if (
        pitch_analysis is not None
        and pitch_analysis["confidence"] >= 0.55
        and pitch_analysis["estimated_note"] is not None
    ):
        coach_notes.append(
            f"Approximate pitch tracking found a stable area around {pitch_analysis['estimated_note']}, but this is not note correctness scoring."
        )

    if note_events:
        coach_notes.append(
            "A short sequence of approximate monophonic note events was detected."
        )
        next_practice_steps.append(
            "Practice with clean single notes and clear separation for cleaner note events."
        )
    elif pitch_analysis is not None and pitch_analysis["confidence"] < 0.55:
        coach_notes.append(
            "Pitch confidence was low, so note estimates should be treated as approximate."
        )
        next_practice_steps.append(
            "For better pitch estimates, record a clean single-note phrase."
        )

    for warning in recording_quality["warnings"]:
        translated_warning = translate_recording_warning(warning)
        if translated_warning not in work_on:
            work_on.append(translated_warning)

    if segment_intensity_changes:
        work_on.append("Your playing intensity changes across the clip.")
        next_practice_steps.append(
            "Try keeping your picking intensity more consistent between sections."
        )

    if not work_on:
        work_on.append(
            "Keep working on clean starts and consistent picking before increasing speed."
        )

    if not next_practice_steps:
        next_practice_steps.append(
            "Record another take at the same settings and compare the measured scores."
        )

    if not what_went_well:
        what_went_well.append(
            "The upload was processed successfully and has enough information for a first pass."
        )

    apply_practice_focus_feedback(
        practice_focus=str(
            (practice_context or {}).get("practice_focus", "general")
        ),
        work_on=work_on,
        next_practice_steps=next_practice_steps,
        coach_notes=coach_notes,
    )

    what_went_well = limit_items(dedupe(what_went_well), 4)
    work_on = limit_items(dedupe(work_on), 4)
    next_practice_steps = limit_items(dedupe(next_practice_steps), 4)
    coach_notes = limit_items(dedupe(coach_notes), 4)
    headline = build_headline(
        overall_score=overall_score,
        quality_level=quality_level,
        attack_activity=attack_activity,
    )
    summary = build_summary(
        analysis=analysis,
        quality_level=quality_level,
        attack_activity=attack_activity,
        brightness_level=brightness_level,
    )
    score_explanation = build_score_explanation(
        overall_score=overall_score,
        quality_level=quality_level,
        attack_activity=attack_activity,
    )

    return {
        "headline": headline,
        "summary": summary,
        "score_explanation": score_explanation,
        "what_went_well": what_went_well,
        "work_on": work_on,
        "next_practice_steps": next_practice_steps,
        "coach_notes": coach_notes,
        "strengths": what_went_well,
        "focus_areas": work_on,
        "next_steps": next_practice_steps,
    }


def build_headline(
    *,
    overall_score: int,
    quality_level: str,
    attack_activity: str,
) -> str:
    if quality_level == "poor":
        return "Start with the recording setup before judging the take."
    if overall_score >= 80 and attack_activity == "moderate":
        return "This take is usable and ready for focused practice."
    if attack_activity == "busy":
        return "The phrase has energy, but control should come before speed."
    if attack_activity == "sparse":
        return "Record a little more phrase activity for a stronger coaching read."
    return "This take gives you a practical baseline to improve from."


def build_summary(
    *,
    analysis: Mapping[str, Any],
    quality_level: str,
    attack_activity: str,
    brightness_level: str,
) -> str:
    quality_text = {
        "poor": "the recording setup needs attention",
        "usable": "the recording is usable for basic feedback",
        "good": "the recording is clear enough for this analysis",
    }[quality_level]
    attack_text = {
        "sparse": "there are only a few clear note starts",
        "moderate": "the note starts are coming through at a manageable pace",
        "busy": "there is a lot of note-start activity packed into the clip",
    }[attack_activity]
    brightness_text = {
        "dark": "the tone is on the darker side",
        "balanced": "the tone is fairly balanced",
        "bright": "the tone is bright enough that pick noise may stand out",
    }[brightness_level]
    return (
        f"I analyzed {analysis['duration_seconds']:.2f} seconds of audio. "
        f"{quality_text.capitalize()}, {attack_text}, and {brightness_text}."
    )


def build_score_explanation(
    *,
    overall_score: int,
    quality_level: str,
    attack_activity: str,
) -> str:
    return (
        f"Your overall score is {overall_score}. Treat it as a snapshot of "
        "recording quality and playing activity, not a grade for note correctness "
        f"or true timing accuracy. This take is weighted by {quality_level} "
        f"recording quality and {attack_activity} attack activity."
    )


def translate_recording_warning(warning: str) -> str:
    if "quiet" in warning.lower():
        return "The recording is quiet, so improve the input level before judging the playing."
    if "clipping" in warning.lower():
        return "The recording may be clipping, so lower the input level and try again."
    if "short" in warning.lower():
        return "The clip is short, so record a longer phrase for more useful feedback."
    if "silence" in warning.lower():
        return "Much of the recording appears to be silence, so trim dead space or play a fuller take."
    return warning


def apply_practice_focus_feedback(
    *,
    practice_focus: str,
    work_on: list[str],
    next_practice_steps: list[str],
    coach_notes: list[str],
) -> None:
    if practice_focus == "note_clarity":
        work_on.insert(
            0,
            "Since you are working on note clarity, focus on making each note start cleanly instead of letting the phrase blur together.",
        )
        next_practice_steps.insert(
            0,
            "Record single-note phrases with clear separation so the coach can read the attack pattern more reliably.",
        )
    elif practice_focus == "timing":
        coach_notes.insert(
            0,
            "Since you are working on timing, use this as an activity read rather than a true rhythm grade.",
        )
        next_practice_steps.insert(
            0,
            "Try playing the same phrase slower with a metronome and focus on even note starts.",
        )
    elif practice_focus == "speed_control":
        work_on.insert(
            0,
            "Since you are working on speed control, the goal is not just playing faster. Keep the note starts clean as the phrase gets busier.",
        )
        next_practice_steps.insert(
            0,
            "Try playing this at a slower tempo, then increase speed only when the notes still sound separated.",
        )
    elif practice_focus == "lead_phrase":
        coach_notes.insert(
            0,
            "Since this is a lead phrase, the pitch and note-event estimates can give a rough read, but they are not a correctness check yet.",
        )
        next_practice_steps.insert(
            0,
            "For better phrase feedback, record a clean single-note line without chords underneath.",
        )
    elif practice_focus == "tone_recording":
        work_on.insert(
            0,
            "Since you are working on tone and recording quality, the first priority is getting a strong, clean signal.",
        )
        next_practice_steps.insert(
            0,
            "A cleaner recording will make every other part of the coach more useful.",
        )


def has_large_segment_intensity_changes(
    segment_analysis: list[Mapping[str, Any]],
) -> bool:
    if len(segment_analysis) < 2:
        return False

    rms_values = [float(segment["rms_energy_mean"]) for segment in segment_analysis]
    return max(rms_values) - min(rms_values) > 0.08


def dedupe(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))


def limit_items(values: list[str], limit: int) -> list[str]:
    return values[:limit]
