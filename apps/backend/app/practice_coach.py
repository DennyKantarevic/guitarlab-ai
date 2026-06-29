from typing import Literal

from fastapi import APIRouter, File, Form, UploadFile
from pydantic import BaseModel, Field

from app.services.practice_audio_analysis import analyze_uploaded_audio


router = APIRouter()


class PracticeMetrics(BaseModel):
    overall_score: int
    timing_activity_score: int
    recording_quality_score: int
    onset_density_per_second: float
    energy_level: Literal["low", "medium", "high"]
    brightness_level: Literal["dark", "balanced", "bright"]
    attack_activity: Literal["sparse", "moderate", "busy"]
    recommendations: list[str] = Field(default_factory=list)


class RecordingQuality(BaseModel):
    peak_amplitude: float
    clipped_sample_ratio: float
    silence_ratio: float
    quality_level: Literal["poor", "usable", "good"]
    warnings: list[str] = Field(default_factory=list)


class SegmentAnalysis(BaseModel):
    segment_index: int
    start_seconds: float
    end_seconds: float
    duration_seconds: float
    onset_count: int
    onset_density_per_second: float
    rms_energy_mean: float
    spectral_centroid_mean: float
    energy_level: Literal["low", "medium", "high"]
    brightness_level: Literal["dark", "balanced", "bright"]
    attack_activity: Literal["sparse", "moderate", "busy"]


class CoachFeedback(BaseModel):
    headline: str
    summary: str
    score_explanation: str
    what_went_well: list[str] = Field(default_factory=list)
    work_on: list[str] = Field(default_factory=list)
    next_practice_steps: list[str] = Field(default_factory=list)
    coach_notes: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    focus_areas: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)


class PracticeContext(BaseModel):
    practice_focus: Literal[
        "general",
        "note_clarity",
        "timing",
        "speed_control",
        "lead_phrase",
        "tone_recording",
    ]
    practice_description: str | None = None


class DetectedPitchNote(BaseModel):
    note: str
    frequency_hz: float
    start_seconds: float
    end_seconds: float
    confidence: float


class PitchAnalysis(BaseModel):
    enabled: bool
    method: str
    estimated_note: str | None
    estimated_frequency_hz: float | None
    confidence: float
    detected_notes: list[DetectedPitchNote] = Field(default_factory=list)
    pitch_warnings: list[str] = Field(default_factory=list)


class NoteEvent(BaseModel):
    note: str
    frequency_hz: float
    start_seconds: float
    end_seconds: float
    duration_seconds: float
    confidence: float


class ReferenceExercise(BaseModel):
    expected_notes_raw: str | None
    expected_notes: list[str] = Field(default_factory=list)
    expected_tab_raw: str | None = None
    source: Literal["notes", "tab", "none"]
    valid: bool
    warnings: list[str] = Field(default_factory=list)


class ReferenceMatch(BaseModel):
    expected_note: str
    detected_note: str
    expected_index: int
    detected_index: int
    confidence: float


class ReferenceMiss(BaseModel):
    expected_note: str
    expected_index: int


class ReferenceExtra(BaseModel):
    detected_note: str
    detected_index: int
    confidence: float


class ReferenceComparison(BaseModel):
    enabled: bool
    valid: bool
    matched_count: int
    missed_count: int
    extra_count: int
    expected_count: int
    detected_count: int
    match_ratio: float | None
    summary: str
    matches: list[ReferenceMatch] = Field(default_factory=list)
    misses: list[ReferenceMiss] = Field(default_factory=list)
    extras: list[ReferenceExtra] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class PracticeAudioAnalysisResponse(BaseModel):
    filename: str
    duration_seconds: float
    sample_rate: int
    tempo_bpm: float | None
    onset_count: int
    rms_energy_mean: float
    spectral_centroid_mean: float
    zero_crossing_rate_mean: float
    analysis_warnings: list[str] = Field(default_factory=list)
    valid: bool
    errors: list[str] = Field(default_factory=list)
    practice_metrics: PracticeMetrics | None = None
    recording_quality: RecordingQuality | None = None
    segment_analysis: list[SegmentAnalysis] | None = None
    coach_feedback: CoachFeedback | None = None
    practice_context: PracticeContext | None = None
    pitch_analysis: PitchAnalysis | None = None
    note_events: list[NoteEvent] | None = None
    reference_exercise: ReferenceExercise | None = None
    reference_comparison: ReferenceComparison | None = None


@router.post("/practice/analyze-audio", response_model=PracticeAudioAnalysisResponse)
async def analyze_practice_audio(
    audio_file: UploadFile | None = File(default=None),
    practice_focus: str | None = Form(default=None),
    practice_description: str | None = Form(default=None),
    expected_notes: str | None = Form(default=None),
    expected_tab: str | None = Form(default=None),
) -> PracticeAudioAnalysisResponse:
    return PracticeAudioAnalysisResponse.model_validate(
        await analyze_uploaded_audio(
            audio_file,
            practice_focus=practice_focus,
            practice_description=practice_description,
            expected_notes=expected_notes,
            expected_tab=expected_tab,
        )
    )
