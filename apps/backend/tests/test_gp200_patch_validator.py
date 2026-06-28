from copy import deepcopy

from app.services.gp200_patch_generator import generate_gp200_patch
from app.services.gp200_patch_validator import (
    get_gp200_effect_coverage,
    load_gp200_profile,
    validate_gp200_profile,
    validate_gp200_patch,
)
from app.tone_maker import ConnectionMode

SEED_WARNING = (
    "This patch uses seed-profile effect names that have not yet been "
    "manually verified against the official Valeton GP-200 effect list."
)
SEED_SOURCE_NOTE = (
    "Initial internal seed effect. Not yet verified against the official "
    "Valeton GP-200 effect list."
)


def valid_patch():
    return generate_gp200_patch(
        tone_goal="metal tight rhythm",
        pickup_type="humbucker bridge",
        connection_mode=ConnectionMode.HEADPHONES,
    )


def assert_invalid_with_error(patch, expected):
    result = validate_gp200_patch(patch)

    assert result.valid is False
    assert any(expected in error for error in result.errors)


def test_validator_catches_unknown_module():
    patch = valid_patch()
    patch["modules"]["SPARKLE"] = {
        "enabled": True,
        "effect": "magic",
        "parameters": {},
    }

    assert_invalid_with_error(patch, "Unknown module: SPARKLE")


def test_validator_catches_unknown_effect():
    patch = valid_patch()
    patch["modules"]["AMP"]["effect"] = "space_amp"

    assert_invalid_with_error(patch, "Unknown effect for AMP: space_amp")


def test_validator_catches_unknown_parameter():
    patch = valid_patch()
    patch["modules"]["AMP"]["parameters"]["sparkle"] = 100

    assert_invalid_with_error(patch, "Unknown parameter for AMP.high_gain_amp: sparkle")


def test_validator_catches_out_of_range_parameter_value():
    patch = valid_patch()
    patch["modules"]["AMP"]["parameters"]["gain"] = 150

    assert_invalid_with_error(patch, "Parameter out of range for AMP.high_gain_amp.gain")


def test_validator_catches_amp_cab_state_against_connection_rules():
    patch = generate_gp200_patch(
        tone_goal="classic rock lead",
        pickup_type="humbucker bridge",
        connection_mode=ConnectionMode.FX_RETURN,
    )
    patch["modules"]["CAB"]["enabled"] = True

    assert_invalid_with_error(
        patch,
        "CAB enabled state does not match connection rule for fx_return",
    )


def test_validator_catches_missing_required_fields():
    patch = deepcopy(valid_patch())
    del patch["modules"]["AMP"]["parameters"]

    assert_invalid_with_error(patch, "Missing parameters for module: AMP")


def test_every_effect_has_seed_metadata_fields():
    profile = load_gp200_profile()

    for module_name, module in profile["modules"].items():
        for effect_id, effect in module["effects"].items():
            assert effect["id"] == effect_id
            assert effect["display_name"]
            assert effect["category"]
            assert effect["verified"] is False
            assert effect["source"] == "seed_profile"
            assert effect["source_note"] == SEED_SOURCE_NOTE
            assert effect.get("official_effect_name") is None
            assert isinstance(effect["parameters"], dict)
            assert effect["parameters"]


def test_existing_seed_effects_validate_without_official_effect_name():
    result = validate_gp200_profile(load_gp200_profile())

    assert result.valid is True
    assert result.errors == []


def test_verified_effect_requires_official_effect_name():
    profile = deepcopy(load_gp200_profile())
    effect = profile["modules"]["PRE"]["effects"]["compressor"]
    effect["verified"] = True
    effect.pop("official_effect_name", None)

    result = validate_gp200_profile(profile)

    assert result.valid is False
    assert (
        "official_effect_name is required for verified effect: PRE.compressor"
        in result.errors
    )


def test_verified_effect_accepts_non_empty_official_effect_name():
    profile = deepcopy(load_gp200_profile())
    effect = profile["modules"]["PRE"]["effects"]["compressor"]
    effect["verified"] = True
    effect["official_effect_name"] = "TEST_ONLY_SOURCE_NAME_DO_NOT_USE_AS_GP200_EFFECT"
    effect["source"] = "user_verified"

    result = validate_gp200_profile(profile)

    assert result.valid is True
    assert result.errors == []


def test_unverified_seed_effects_warn_without_invalidating_patch():
    patch = valid_patch()
    result = validate_gp200_patch(patch)

    assert result.valid is True
    assert result.errors == []
    assert result.warnings.count(SEED_WARNING) == 1


def test_gp200_effect_coverage_counts_seed_profile_effects():
    coverage = get_gp200_effect_coverage(load_gp200_profile())

    assert coverage == {
        "total_effects": 18,
        "verified_effects": 0,
        "unverified_effects": 18,
        "sources": {"seed_profile": 18},
    }
