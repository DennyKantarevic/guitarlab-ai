from typing import Any, Literal, Mapping


EnergyLevel = Literal["low", "medium", "high"]
BrightnessLevel = Literal["dark", "balanced", "bright"]
AttackActivity = Literal["sparse", "moderate", "busy"]


def score_practice_analysis(analysis: Mapping[str, Any]) -> dict[str, Any]:
    duration_seconds = float(analysis["duration_seconds"])
    tempo_bpm = analysis["tempo_bpm"]
    onset_count = int(analysis["onset_count"])
    rms_energy_mean = float(analysis["rms_energy_mean"])
    spectral_centroid_mean = float(analysis["spectral_centroid_mean"])
    zero_crossing_rate_mean = float(analysis["zero_crossing_rate_mean"])

    onset_density_per_second = (
        onset_count / duration_seconds if duration_seconds > 0 else 0.0
    )
    attack_activity = classify_attack_activity(onset_density_per_second)
    energy_level = classify_energy_level(rms_energy_mean)
    brightness_level = classify_brightness_level(spectral_centroid_mean)

    recording_quality_score = calculate_recording_quality_score(
        duration_seconds=duration_seconds,
        onset_count=onset_count,
        rms_energy_mean=rms_energy_mean,
        zero_crossing_rate_mean=zero_crossing_rate_mean,
    )
    timing_activity_score = calculate_timing_activity_score(
        onset_density_per_second=onset_density_per_second,
        tempo_detected=tempo_bpm is not None,
    )
    overall_score = int(
        round((timing_activity_score + recording_quality_score) / 2)
    )

    return {
        "overall_score": overall_score,
        "timing_activity_score": timing_activity_score,
        "recording_quality_score": recording_quality_score,
        "onset_density_per_second": onset_density_per_second,
        "energy_level": energy_level,
        "brightness_level": brightness_level,
        "attack_activity": attack_activity,
        "recommendations": build_recommendations(
            duration_seconds=duration_seconds,
            onset_count=onset_count,
            energy_level=energy_level,
            brightness_level=brightness_level,
            attack_activity=attack_activity,
        ),
    }


def classify_attack_activity(onset_density_per_second: float) -> AttackActivity:
    if onset_density_per_second < 1.0:
        return "sparse"
    if onset_density_per_second <= 5.0:
        return "moderate"
    return "busy"


def classify_energy_level(rms_energy_mean: float) -> EnergyLevel:
    if rms_energy_mean < 0.03:
        return "low"
    if rms_energy_mean <= 0.20:
        return "medium"
    return "high"


def classify_brightness_level(spectral_centroid_mean: float) -> BrightnessLevel:
    if spectral_centroid_mean < 1200:
        return "dark"
    if spectral_centroid_mean <= 3500:
        return "balanced"
    return "bright"


def calculate_recording_quality_score(
    *,
    duration_seconds: float,
    onset_count: int,
    rms_energy_mean: float,
    zero_crossing_rate_mean: float,
) -> int:
    score = 100
    if rms_energy_mean < 0.03:
        score -= 30
    if zero_crossing_rate_mean > 0.15:
        score -= 20
    if duration_seconds < 1.0:
        score -= 20
    if onset_count == 0:
        score -= 25
    return clamp_score(score)


def calculate_timing_activity_score(
    *,
    onset_density_per_second: float,
    tempo_detected: bool,
) -> int:
    if onset_density_per_second == 0:
        score = 20
    elif onset_density_per_second < 1.0:
        score = 50
    elif onset_density_per_second <= 5.0:
        score = 85
    else:
        score = 70

    score += 10 if tempo_detected else -10
    return clamp_score(score)


def build_recommendations(
    *,
    duration_seconds: float,
    onset_count: int,
    energy_level: EnergyLevel,
    brightness_level: BrightnessLevel,
    attack_activity: AttackActivity,
) -> list[str]:
    recommendations: list[str] = []

    if onset_count == 0:
        recommendations.append(
            "Try recording a clearer phrase with distinct note attacks."
        )
    if duration_seconds < 2:
        recommendations.append(
            "Record at least a few seconds so the coach can analyze more of your playing."
        )
    if energy_level == "low":
        recommendations.append(
            "Increase input gain slightly or play closer to the microphone/interface."
        )
    if brightness_level == "bright":
        recommendations.append(
            "Your tone is very bright; consider reducing treble or picking closer to the neck."
        )
    if attack_activity == "busy":
        recommendations.append(
            "Try practicing the phrase slower with a metronome to keep note attacks controlled."
        )
    if attack_activity == "sparse":
        recommendations.append(
            "Try playing a longer phrase or scale run for a more useful analysis."
        )

    return recommendations


def clamp_score(score: int) -> int:
    return max(0, min(100, score))
