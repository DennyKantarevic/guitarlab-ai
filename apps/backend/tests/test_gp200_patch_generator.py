import json

import pytest

from app.services.gp200_patch_generator import (
    STYLE_KEYWORDS,
    generate_gp200_patch,
    load_style_templates,
)
from app.services.gp200_patch_validator import load_gp200_profile, validate_gp200_patch
from app.tone_maker import ConnectionMode


@pytest.mark.parametrize(
    ("style_name", "tone_goal"),
    [
        ("grunge", "grunge dirty chorus rhythm"),
        ("metal", "metal tight rhythm"),
        ("blues", "blues edge of breakup"),
        ("shoegaze", "shoegaze ambient wash"),
        ("punk", "punk raw rhythm"),
        ("classic_rock", "classic rock lead"),
        ("clean_indie", "clean indie jangle"),
        ("funk", "funk clean quack"),
    ],
)
def test_generated_patches_validate_successfully_for_all_style_templates(
    style_name,
    tone_goal,
):
    patch = generate_gp200_patch(
        tone_goal=tone_goal,
        pickup_type="humbucker bridge",
        connection_mode=ConnectionMode.HEADPHONES,
    )

    result = validate_gp200_patch(patch)

    assert style_name in load_style_templates()
    assert style_name in STYLE_KEYWORDS
    assert patch["device"] == "Valeton"
    assert patch["model"] == "GP-200"
    assert patch["style"] == style_name
    assert patch["valid"] is True
    assert result.valid is True
    assert result.errors == []


def test_pickup_adjustments_are_applied_to_generated_patch():
    patch = generate_gp200_patch(
        tone_goal="metal tight rhythm",
        pickup_type="single coil bridge",
        connection_mode=ConnectionMode.DIRECT_USB,
    )

    assert patch["modules"]["AMP"]["parameters"]["gain"] > 70
    assert any("single coil" in warning.lower() for warning in patch["warnings"])


def test_generated_patch_contains_no_copied_non_valeton_references():
    patch = generate_gp200_patch(
        tone_goal="shoegaze ambient wash",
        pickup_type="single coil neck",
        connection_mode=ConnectionMode.HEADPHONES,
    )

    serialized = json.dumps(patch)

    forbidden_references = ["Mo" + "oer", "GE " + "Labs", "GE" + "200"]
    assert not any(reference in serialized for reference in forbidden_references)


def test_all_generated_effects_exist_in_gp200_profile():
    profile = load_gp200_profile()

    for style_name, template in load_style_templates().items():
        patch = generate_gp200_patch(
            tone_goal=f"{style_name.replace('_', ' ')} test",
            pickup_type="humbucker bridge",
            connection_mode=ConnectionMode.DIRECT_USB,
        )

        for module_name, module_patch in patch["modules"].items():
            assert module_name in profile["modules"]
            assert module_patch["effect"] in profile["modules"][module_name]["effects"]


def test_generated_patch_warns_once_for_unverified_seed_effects():
    patch = generate_gp200_patch(
        tone_goal="metal tight rhythm",
        pickup_type="humbucker bridge",
        connection_mode=ConnectionMode.HEADPHONES,
    )

    seed_warning = (
        "This patch uses seed-profile effect names that have not yet been "
        "manually verified against the official Valeton GP-200 effect list."
    )

    assert patch["valid"] is True
    assert patch["warnings"].count(seed_warning) == 1
