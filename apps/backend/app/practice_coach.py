from typing import Literal

from fastapi import APIRouter, File, UploadFile
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
    pitch_analysis: PitchAnalysis | None = None
    note_events: list[NoteEvent] | None = None


@router.post("/practice/analyze-audio", response_model=PracticeAudioAnalysisResponse)
async def analyze_practice_audio(
    audio_file: UploadFile | None = File(default=None),
) -> PracticeAudioAnalysisResponse:
    return PracticeAudioAnalysisResponse.model_validate(
        await analyze_uploaded_audio(audio_file)
    )
