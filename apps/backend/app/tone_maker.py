from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.services.gp200_patch_generator import generate_gp200_patch


class ConnectionMode(StrEnum):
    HEADPHONES = "headphones"
    DIRECT_USB = "direct_usb"
    GUITAR_AMP_INPUT = "guitar_amp_input"
    FX_RETURN = "fx_return"
    FOUR_CABLE_METHOD = "four_cable_method"


class Gp200ToneRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tone_goal: str = Field(min_length=1)
    pickup_type: str = Field(min_length=1)
    connection_mode: ConnectionMode


class Gp200PatchResponse(BaseModel):
    device: str
    model: str
    style: str
    tone_goal: str
    pickup_type: str
    connection_mode: ConnectionMode
    signal_chain: list[str]
    modules: dict[str, dict[str, Any]]
    warnings: list[str]
    summary: str
    valid: bool
    errors: list[str] = Field(default_factory=list)


def build_gp200_patch(request: Gp200ToneRequest) -> Gp200PatchResponse:
    return Gp200PatchResponse.model_validate(
        generate_gp200_patch(
            tone_goal=request.tone_goal,
            pickup_type=request.pickup_type,
            connection_mode=request.connection_mode,
        )
    )
