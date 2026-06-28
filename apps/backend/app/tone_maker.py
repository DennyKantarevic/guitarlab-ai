from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


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
    tone_goal: str
    pickup_type: str
    connection_mode: ConnectionMode
    signal_chain: list[str]
    modules: dict[str, dict[str, Any]]
    warnings: list[str]
    valid: bool


def build_gp200_patch(request: Gp200ToneRequest) -> Gp200PatchResponse:
    warnings = connection_mode_warnings(request.connection_mode)
    modules = build_placeholder_modules(request.connection_mode)

    return Gp200PatchResponse(
        device="Mooer",
        model="GE Labs GP-200",
        tone_goal=request.tone_goal,
        pickup_type=request.pickup_type,
        connection_mode=request.connection_mode,
        signal_chain=[
            "noise_gate",
            "drive",
            "amp",
            "cab",
            "eq",
            "delay",
            "reverb",
        ],
        modules=modules,
        warnings=warnings,
        valid=True,
    )


def connection_mode_warnings(connection_mode: ConnectionMode) -> list[str]:
    if connection_mode == ConnectionMode.FX_RETURN:
        return ["Cab disabled for FX return into a power amp or amp return."]
    if connection_mode == ConnectionMode.GUITAR_AMP_INPUT:
        return ["Use conservative output level into the front of a guitar amp."]
    if connection_mode == ConnectionMode.FOUR_CABLE_METHOD:
        return ["Place drive before the amp input and time effects after the loop."]
    return []


def build_placeholder_modules(
    connection_mode: ConnectionMode,
) -> dict[str, dict[str, Any]]:
    cab_enabled = connection_mode in {
        ConnectionMode.HEADPHONES,
        ConnectionMode.DIRECT_USB,
    }

    return {
        "noise_gate": {"enabled": True, "threshold": 38, "release": 45},
        "drive": {"enabled": True, "model": "808 OD", "gain": 18, "level": 58},
        "amp": {"enabled": True, "model": "US Hi Gain", "gain": 46, "master": 62},
        "cab": {"enabled": cab_enabled, "model": "4x12 Modern V30", "mic": "SM57"},
        "eq": {"enabled": True, "low": 48, "mid": 44, "high": 56, "presence": 52},
        "delay": {"enabled": False, "time_ms": 380, "mix": 16},
        "reverb": {"enabled": True, "model": "Room", "mix": 12},
    }
