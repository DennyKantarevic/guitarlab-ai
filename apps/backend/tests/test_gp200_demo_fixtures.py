import json
from pathlib import Path

import pytest

from app.services.gp200_patch_validator import (
    UNVERIFIED_EFFECT_WARNING,
    load_gp200_profile,
)
from app.tone_maker import Gp200ToneRequest, build_gp200_patch


FIXTURE_PATH = Path(__file__).parent / "fixtures" / "gp200_demo_requests.json"
EXPECTED_DEMO_REQUESTS = {
    "grunge_humbucker_headphones": {
        "tone_goal": "90s grunge like Nirvana but heavier",
        "pickup_type": "humbucker bridge",
        "connection_mode": "headphones",
    },
    "metal_direct_usb": {
        "tone_goal": "metal tight chug heavy rhythm",
        "pickup_type": "humbucker bridge",
        "connection_mode": "direct_usb",
    },
    "funk_four_cable": {
        "tone_goal": "funk clean quack percussive",
        "pickup_type": "single coil bridge",
        "connection_mode": "four_cable_method",
    },
    "blues_fx_return": {
        "tone_goal": "warm blues breakup overdrive",
        "pickup_type": "single coil neck",
        "connection_mode": "fx_return",
    },
    "unknown_fallback": {
        "tone_goal": "smooth glassy experimental tone",
        "pickup_type": "unknown",
        "connection_mode": "headphones",
    },
}
TONE_INTENT_FIELDS = {
    "selected_style",
    "matched_keywords",
    "fallback_used",
    "pickup_adjustments",
    "connection_rules_applied",
    "confidence",
}


def load_demo_requests():
    with FIXTURE_PATH.open() as file:
        return json.load(file)


@pytest.mark.parametrize("fixture_name", sorted(EXPECTED_DEMO_REQUESTS))
def test_gp200_demo_requests_return_valid_verified_patch_responses(fixture_name):
    demo_requests = load_demo_requests()
    assert demo_requests == EXPECTED_DEMO_REQUESTS

    patch = build_gp200_patch(Gp200ToneRequest(**demo_requests[fixture_name])).model_dump(
        mode="json"
    )
    instructions = patch["dial_in_instructions"]

    assert patch["device"] == "Valeton"
    assert patch["model"] == "GP-200"
    assert patch["valid"] is True
    assert patch["errors"] == []
    assert set(patch["tone_intent"]) == TONE_INTENT_FIELDS
    assert instructions
    assert any("Valeton GP-200" in instruction for instruction in instructions)
    assert (
        f"Set the signal chain to: {' > '.join(patch['signal_chain'])}."
        in instructions
    )
    assert UNVERIFIED_EFFECT_WARNING not in patch["warnings"]
    assert not any(UNVERIFIED_EFFECT_WARNING in instruction for instruction in instructions)


def test_gp200_demo_requests_select_expected_styles_and_explanations():
    demo_requests = load_demo_requests()
    patches = {
        fixture_name: build_gp200_patch(Gp200ToneRequest(**payload)).model_dump(
            mode="json"
        )
        for fixture_name, payload in demo_requests.items()
    }

    assert patches["grunge_humbucker_headphones"]["tone_intent"][
        "selected_style"
    ] == "grunge"

    metal_intent = patches["metal_direct_usb"]["tone_intent"]
    assert metal_intent["selected_style"] == "metal"
    assert metal_intent["confidence"] == "high"

    funk_intent = patches["funk_four_cable"]["tone_intent"]
    assert funk_intent["selected_style"] == "funk"
    assert funk_intent["connection_rules_applied"] == [
        "Four-cable method disables AMP and CAB and expects routing around the real amp preamp."
    ]

    assert patches["blues_fx_return"]["tone_intent"]["selected_style"] == "blues"

    fallback_intent = patches["unknown_fallback"]["tone_intent"]
    assert fallback_intent["selected_style"] == "clean_indie"
    assert fallback_intent["fallback_used"] is True
    assert fallback_intent["confidence"] == "low"


def test_gp200_demo_requests_use_configured_verified_effects():
    profile = load_gp200_profile()
    demo_requests = load_demo_requests()
    patches = {
        fixture_name: build_gp200_patch(Gp200ToneRequest(**payload)).model_dump(
            mode="json"
        )
        for fixture_name, payload in demo_requests.items()
    }

    expected_effects = {
        "grunge_humbucker_headphones": {"AMP": "amp_uk_800"},
        "metal_direct_usb": {"AMP": "amp_mess_dualm", "DST": "dst_precise_od"},
        "funk_four_cable": {"WAH": "wah_v_wah", "AMP": "amp_bellman_59n"},
        "unknown_fallback": {"AMP": "amp_dark_twin", "MOD": "mod_g_chorus"},
    }

    for fixture_name, module_expectations in expected_effects.items():
        patch = patches[fixture_name]
        for module_name, effect_id in module_expectations.items():
            effect = profile["modules"][module_name]["effects"][effect_id]
            assert patch["modules"][module_name]["effect"] == effect_id
            assert effect["verified"] is True


def test_gp200_demo_dial_in_instructions_use_verified_amp_names():
    demo_requests = load_demo_requests()
    grunge_patch = build_gp200_patch(
        Gp200ToneRequest(**demo_requests["grunge_humbucker_headphones"])
    ).model_dump(mode="json")
    metal_patch = build_gp200_patch(
        Gp200ToneRequest(**demo_requests["metal_direct_usb"])
    ).model_dump(mode="json")

    assert "Enable AMP and select UK 800." in grunge_patch["dial_in_instructions"]
    assert "Enable AMP and select Mess DualM." in metal_patch["dial_in_instructions"]
