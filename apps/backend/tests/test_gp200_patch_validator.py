from copy import deepcopy

from app.services.gp200_patch_generator import generate_gp200_patch
from app.services.gp200_patch_validator import validate_gp200_patch
from app.tone_maker import ConnectionMode


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
