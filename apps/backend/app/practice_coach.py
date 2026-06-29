from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel, Field

from app.services.practice_audio_analysis import analyze_uploaded_audio


router = APIRouter()


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


@router.post("/practice/analyze-audio", response_model=PracticeAudioAnalysisResponse)
async def analyze_practice_audio(
    audio_file: UploadFile | None = File(default=None),
) -> PracticeAudioAnalysisResponse:
    return PracticeAudioAnalysisResponse.model_validate(
        await analyze_uploaded_audio(audio_file)
    )
