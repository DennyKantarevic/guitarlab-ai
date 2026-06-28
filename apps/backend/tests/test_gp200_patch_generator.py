import pytest

from app.services.gp200_patch_generator import (
    STYLE_KEYWORDS,
    generate_gp200_patch,
    load_style_templates,
)
from app.services.gp200_patch_validator import validate_gp200_patch
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
