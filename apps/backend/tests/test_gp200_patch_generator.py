import json

import pytest

from app.services.gp200_patch_generator import (
    STYLE_KEYWORDS,
    generate_gp200_patch,
    load_style_templates,
)
from app.services.gp200_patch_validator import load_gp200_profile, validate_gp200_patch
from app.tone_maker import ConnectionMode

HUMBUCKER_PICKUP_INTENT = (
    "Humbucker input detected; keep high-gain patches controlled with noise "
    "reduction and avoid excessive low-end buildup."
)
SINGLE_COIL_PICKUP_INTENT = (
    "Single-coil input detected; preserve brightness and watch for noise on "
    "higher-gain patches."
)
FOUR_CABLE_METHOD_INTENT = (
    "Four-cable method disables AMP and CAB and expects routing around the "
    "real amp preamp."
)
SEED_WARNING = (
    "This patch uses seed-profile effect names that have not yet been "
    "manually verified against the official Valeton GP-200 effect list."
)

EXPECTED_STYLE_KEYWORDS = {
    "grunge": ("grunge", "nirvana", "alternative", "dirty", "90s"),
    "metal": ("metal", "tight", "chug", "high gain", "heavy"),
    "blues": ("blues", "warm", "breakup", "overdrive"),
    "shoegaze": ("shoegaze", "ambient", "wash", "dreamy"),
    "punk": ("punk", "raw", "aggressive"),
    "classic_rock": ("classic rock", "crunch", "vintage"),
    "clean_indie": ("clean", "indie", "bright", "jangly"),
    "funk": ("funk", "quack", "percussive"),
}
EXPECTED_VERIFIED_STYLE_EFFECTS = {
    "grunge": {
        "DST": "dst_revolt",
        "AMP": "amp_uk_800",
        "NR": "nr_gate_2",
        "CAB": "cab_uk_ld",
        "EQ": "eq_guitar_eq_1",
        "MOD": "mod_a_chorus",
        "RVB": "rvb_room",
    },
    "metal": {
        "DST": "dst_precise_od",
        "AMP": "amp_mess_dualm",
        "NR": "nr_gate_3",
        "CAB": "cab_uk_ld",
        "EQ": "eq_hyper_eq",
        "RVB": "rvb_room",
    },
    "blues": {
        "DST": "dst_od_9",
        "AMP": "amp_tweedy",
        "CAB": "cab_uk_ld",
        "EQ": "eq_guitar_eq_1",
        "RVB": "rvb_tube_spring",
    },
    "shoegaze": {
        "AMP": "amp_dark_twin",
        "CAB": "cab_uk_ld",
        "EQ": "eq_guitar_eq_1",
        "MOD": "mod_g_chorus",
        "DLY": "dly_bbd_delay_s",
        "RVB": "rvb_plate",
    },
    "punk": {
        "DST": "dst_revolt",
        "AMP": "amp_uk_800",
        "NR": "nr_gate_1",
        "CAB": "cab_uk_ld",
        "RVB": "rvb_room",
    },
    "classic_rock": {
        "DST": "dst_green_od",
        "AMP": "amp_uk_800",
        "CAB": "cab_uk_ld",
        "EQ": "eq_guitar_eq_1",
        "RVB": "rvb_plate",
    },
    "clean_indie": {
        "AMP": "amp_dark_twin",
        "CAB": "cab_uk_ld",
        "EQ": "eq_guitar_eq_1",
        "MOD": "mod_g_chorus",
        "DLY": "dly_analog_delay",
        "RVB": "rvb_room",
    },
    "funk": {
        "WAH": "wah_v_wah",
        "AMP": "amp_bellman_59n",
        "CAB": "cab_uk_ld",
        "EQ": "eq_guitar_eq_1",
        "RVB": "rvb_room",
    },
}


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
    assert SEED_WARNING not in patch["warnings"]


def test_pickup_adjustments_are_applied_to_generated_patch():
    patch = generate_gp200_patch(
        tone_goal="metal tight rhythm",
        pickup_type="single coil bridge",
        connection_mode=ConnectionMode.DIRECT_USB,
    )
    template = load_style_templates()[patch["style"]]

    assert (
        patch["modules"]["AMP"]["parameters"]["gain"]
        > template["modules"]["AMP"]["parameters"]["gain"]
    )
    assert any("single coil" in warning.lower() for warning in patch["warnings"])


@pytest.mark.parametrize(
    ("pickup_type", "expected_warning", "parameter_checks"),
    [
        (
            "humbucker bridge",
            "Humbucker pickup detected: trimmed amp gain slightly.",
            (("AMP", "gain", "decreased"),),
        ),
        (
            "single coil bridge",
            "Single coil pickup detected: added amp gain and drive output.",
            (("AMP", "gain", "increased"), ("DST", "volume", "increased")),
        ),
        (
            "p90 bridge",
            "P-90 pickup detected: emphasized midrange.",
            (("AMP", "middle", "increased"),),
        ),
    ],
)
def test_pickup_change_warnings_match_generated_parameter_changes(
    pickup_type,
    expected_warning,
    parameter_checks,
):
    patch = generate_gp200_patch(
        tone_goal="metal tight rhythm",
        pickup_type=pickup_type,
        connection_mode=ConnectionMode.HEADPHONES,
    )
    template_modules = load_style_templates()[patch["style"]]["modules"]

    assert expected_warning in patch["warnings"]
    for module_name, parameter_name, direction in parameter_checks:
        generated_value = patch["modules"][module_name]["parameters"][parameter_name]
        template_value = template_modules[module_name]["parameters"][parameter_name]
        if direction == "increased":
            assert generated_value > template_value
        else:
            assert generated_value < template_value


def test_pickup_explanations_do_not_claim_parameter_changes():
    humbucker_patch = generate_gp200_patch(
        tone_goal="metal tight rhythm",
        pickup_type="humbucker bridge",
        connection_mode=ConnectionMode.HEADPHONES,
    )
    single_coil_patch = generate_gp200_patch(
        tone_goal="clean bright jangle",
        pickup_type="single coil neck",
        connection_mode=ConnectionMode.HEADPHONES,
    )

    explanations = [
        *humbucker_patch["tone_intent"]["pickup_adjustments"],
        *single_coil_patch["tone_intent"]["pickup_adjustments"],
    ]
    parameter_change_claims = ("trimmed", "added", "emphasized", "changed")

    assert not any(
        claim in explanation.lower()
        for explanation in explanations
        for claim in parameter_change_claims
    )


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


def test_generated_patch_omits_seed_warning_when_all_effects_are_verified():
    patch = generate_gp200_patch(
        tone_goal="metal tight rhythm",
        pickup_type="humbucker bridge",
        connection_mode=ConnectionMode.HEADPHONES,
    )

    assert patch["valid"] is True
    assert SEED_WARNING not in patch["warnings"]


def test_seed_warning_still_appears_for_seed_fallback_effects():
    patch = generate_gp200_patch(
        tone_goal="metal tight rhythm",
        pickup_type="humbucker bridge",
        connection_mode=ConnectionMode.HEADPHONES,
    )
    patch["modules"]["PRE"] = {
        "enabled": True,
        "effect": "compressor",
        "parameters": {"sustain": 44, "attack": 34, "level": 58},
    }

    result = validate_gp200_patch(patch)

    assert result.valid is True
    assert result.warnings.count(SEED_WARNING) == 1


def test_style_templates_prefer_verified_effects_where_configured():
    profile = load_gp200_profile()

    for style_name, expected_modules in EXPECTED_VERIFIED_STYLE_EFFECTS.items():
        template = load_style_templates()[style_name]
        for module_name, effect_id in expected_modules.items():
            effect = profile["modules"][module_name]["effects"][effect_id]
            assert template["modules"][module_name]["effect"] == effect_id
            assert effect["verified"] is True


def test_generated_patches_use_only_verified_effects_after_template_update():
    profile = load_gp200_profile()

    for style_name in load_style_templates():
        patch = generate_gp200_patch(
            tone_goal=f"{style_name.replace('_', ' ')} test",
            pickup_type="humbucker bridge",
            connection_mode=ConnectionMode.HEADPHONES,
        )

        assert patch["valid"] is True
        for module_name, module_patch in patch["modules"].items():
            effect = profile["modules"][module_name]["effects"][module_patch["effect"]]
            assert effect["verified"] is True


@pytest.mark.parametrize(
    ("connection_mode", "expected_instruction"),
    [
        (
            ConnectionMode.HEADPHONES,
            "Keep AMP and CAB enabled for full-range output.",
        ),
        (
            ConnectionMode.DIRECT_USB,
            "Keep AMP and CAB enabled for full-range output.",
        ),
        (
            ConnectionMode.GUITAR_AMP_INPUT,
            "Keep AMP and CAB disabled when running into a guitar amp input.",
        ),
        (
            ConnectionMode.FX_RETURN,
            "Keep AMP enabled and CAB disabled when running into an FX return.",
        ),
        (
            ConnectionMode.FOUR_CABLE_METHOD,
            (
                "Keep AMP and CAB disabled and route drive/front-end effects before "
                "the amp preamp, with time/modulation effects in the loop."
            ),
        ),
    ],
)
def test_dial_in_instructions_include_connection_mode_rules(
    connection_mode,
    expected_instruction,
):
    patch = generate_gp200_patch(
        tone_goal="metal tight rhythm",
        pickup_type="humbucker bridge",
        connection_mode=connection_mode,
    )

    assert expected_instruction in patch["dial_in_instructions"]


def test_dial_in_instructions_include_disabled_module_guidance():
    patch = generate_gp200_patch(
        tone_goal="punk raw rhythm",
        pickup_type="p90 bridge",
        connection_mode=ConnectionMode.GUITAR_AMP_INPUT,
    )

    assert "Keep AMP disabled for this connection mode." in patch["dial_in_instructions"]
    assert "Keep CAB disabled for this connection mode." in patch["dial_in_instructions"]


def test_style_keywords_match_tone_intent_spec():
    assert STYLE_KEYWORDS == EXPECTED_STYLE_KEYWORDS


def test_grunge_tone_goal_selects_grunge_with_matched_keyword():
    patch = generate_gp200_patch(
        tone_goal="90s dirty alternative rhythm",
        pickup_type="humbucker bridge",
        connection_mode=ConnectionMode.HEADPHONES,
    )

    assert patch["style"] == "grunge"
    assert patch["tone_intent"]["selected_style"] == "grunge"
    assert patch["tone_intent"]["matched_keywords"]
    assert "dirty" in patch["tone_intent"]["matched_keywords"]
    assert patch["tone_intent"]["fallback_used"] is False


def test_metal_tight_chug_heavy_selects_metal_with_high_confidence():
    patch = generate_gp200_patch(
        tone_goal="metal tight chug heavy",
        pickup_type="humbucker bridge",
        connection_mode=ConnectionMode.HEADPHONES,
    )

    assert patch["style"] == "metal"
    assert patch["tone_intent"]["selected_style"] == "metal"
    assert patch["tone_intent"]["matched_keywords"] == ["metal", "tight", "chug", "heavy"]
    assert patch["tone_intent"]["fallback_used"] is False
    assert patch["tone_intent"]["confidence"] == "high"


def test_unknown_tone_goal_falls_back_to_clean_indie_with_low_confidence():
    patch = generate_gp200_patch(
        tone_goal="transparent airport shimmer",
        pickup_type="humbucker bridge",
        connection_mode=ConnectionMode.HEADPHONES,
    )

    assert patch["style"] == "clean_indie"
    assert patch["tone_intent"]["selected_style"] == "clean_indie"
    assert patch["tone_intent"]["matched_keywords"] == []
    assert patch["tone_intent"]["fallback_used"] is True
    assert patch["tone_intent"]["confidence"] == "low"


def test_humbucker_pickup_returns_pickup_adjustment_explanation():
    patch = generate_gp200_patch(
        tone_goal="metal tight rhythm",
        pickup_type="humbuckers",
        connection_mode=ConnectionMode.HEADPHONES,
    )

    assert patch["tone_intent"]["pickup_adjustments"] == [HUMBUCKER_PICKUP_INTENT]


def test_single_coil_pickup_returns_pickup_adjustment_explanation():
    patch = generate_gp200_patch(
        tone_goal="clean bright jangle",
        pickup_type="single-coil neck",
        connection_mode=ConnectionMode.HEADPHONES,
    )

    assert patch["tone_intent"]["pickup_adjustments"] == [SINGLE_COIL_PICKUP_INTENT]


def test_four_cable_method_returns_connection_rule_explanation():
    patch = generate_gp200_patch(
        tone_goal="classic rock crunch",
        pickup_type="humbucker bridge",
        connection_mode=ConnectionMode.FOUR_CABLE_METHOD,
    )

    assert patch["tone_intent"]["connection_rules_applied"] == [
        FOUR_CABLE_METHOD_INTENT
    ]
