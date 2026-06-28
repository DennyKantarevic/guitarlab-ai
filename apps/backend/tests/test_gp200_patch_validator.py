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
ALLOWED_EFFECT_SOURCES = {
    "seed_profile",
    "manual",
    "editor_export",
    "user_verified",
    "unknown",
}
EXPECTED_SEED_EFFECTS = {
    ("PRE", "compressor"),
    ("WAH", "auto_wah"),
    ("DST", "overdrive"),
    ("DST", "distortion"),
    ("DST", "fuzz"),
    ("AMP", "clean_amp"),
    ("AMP", "driven_amp"),
    ("AMP", "high_gain_amp"),
    ("NR", "noise_gate"),
    ("CAB", "matched_cab"),
    ("EQ", "parametric_eq"),
    ("MOD", "chorus"),
    ("MOD", "phaser"),
    ("DLY", "analog_delay"),
    ("DLY", "digital_delay"),
    ("RVB", "room_reverb"),
    ("RVB", "plate_reverb"),
    ("VOL", "volume"),
}
EXPECTED_VERIFIED_BATCH_001 = {
    ("PRE", "pre_comp"): (
        "COMP",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, PRE, page 26",
    ),
    ("PRE", "pre_comp4"): (
        "COMP4",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, PRE, page 26",
    ),
    ("PRE", "pre_s_comp"): (
        "S-Comp",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, PRE, page 26",
    ),
    ("PRE", "pre_micro_boost"): (
        "Micro Boost",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, PRE, page 26",
    ),
    ("PRE", "pre_ac_boost"): (
        "AC Boost",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, PRE, page 26",
    ),
    ("PRE", "pre_od_9"): (
        "OD 9",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, PRE, page 28",
    ),
    ("PRE", "pre_yellow_od"): (
        "Yellow OD",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, PRE, page 28",
    ),
    ("PRE", "pre_penesas"): (
        "Penesas",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, PRE, page 28",
    ),
    ("PRE", "pre_t_wah"): (
        "T-Wah",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, PRE, page 29",
    ),
    ("PRE", "pre_a_wah"): (
        "A-WAH",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, PRE, page 29",
    ),
    ("WAH", "wah_v_wah"): (
        "V-Wah",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, WAH, page 32",
    ),
    ("WAH", "wah_c_wah"): (
        "C-Wah",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, WAH, page 32",
    ),
    ("WAH", "wah_p_wah"): (
        "P-Wah",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, WAH, page 32",
    ),
    ("WAH", "wah_s_wah"): (
        "S-Wah",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, WAH, page 32",
    ),
    ("WAH", "wah_hammy"): (
        "Hammy",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, WAH, page 32",
    ),
    ("DST", "dst_green_od"): (
        "Green OD",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, DST, page 33",
    ),
    ("DST", "dst_od_9"): (
        "OD 9",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, DST, page 33",
    ),
    ("DST", "dst_tube"): (
        "Tube",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, DST, page 34",
    ),
    ("DST", "dst_precise_od"): (
        "Precise OD",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, DST, page 35",
    ),
    ("DST", "dst_lazaro"): (
        "Lazaro",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, DST, page 36",
    ),
    ("DST", "dst_red_haze"): (
        "Red Haze",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, DST, page 36",
    ),
    ("DST", "dst_plustortion"): (
        "Plustortion",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, DST, page 36",
    ),
    ("DST", "dst_chief"): (
        "Chief",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, DST, page 37",
    ),
    ("DST", "dst_revolt"): (
        "Revolt",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, DST, page 37",
    ),
    ("AMP", "amp_tweedy"): (
        "Tweedy",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, AMP, page 40",
    ),
    ("AMP", "amp_bellman_59n"): (
        "Bellman 59N",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, AMP, page 40",
    ),
    ("AMP", "amp_dark_twin"): (
        "Dark Twin",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, AMP, page 40",
    ),
    ("AMP", "amp_uk_800"): (
        "UK 800",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, AMP, page 47",
    ),
    ("AMP", "amp_mess_dualm"): (
        "Mess DualM",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, AMP, page 50",
    ),
    ("NR", "nr_gate_1"): (
        "Gate 1",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, NR, page 53",
    ),
    ("NR", "nr_gate_2"): (
        "Gate 2",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, NR, page 53",
    ),
    ("NR", "nr_gate_3"): (
        "Gate 3",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, NR, page 54",
    ),
    ("CAB", "cab_uk_ld"): (
        "UK LD",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, CAB, page 55",
    ),
    ("EQ", "eq_guitar_eq_1"): (
        "Guitar EQ 1",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, EQ, page 57",
    ),
    ("EQ", "eq_hyper_eq"): (
        "Hyper EQ",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, EQ, page 57",
    ),
    ("MOD", "mod_a_chorus"): (
        "A-Chorus",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, MOD, page 58",
    ),
    ("MOD", "mod_g_chorus"): (
        "G-Chorus",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, MOD, page 58",
    ),
    ("MOD", "mod_jet"): (
        "Jet",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, MOD, page 58",
    ),
    ("MOD", "mod_o_phase"): (
        "O-Phase",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, MOD, page 59",
    ),
    ("DLY", "dly_bbd_delay_s"): (
        "BBD Delay S",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, DLY, page 62",
    ),
    ("DLY", "dly_digital_delay_s"): (
        "Digital Delay S",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, DLY, page 63",
    ),
    ("DLY", "dly_analog_delay"): (
        "Analog Delay",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, DLY, page 64",
    ),
    ("DLY", "dly_broken_delay"): (
        "Broken Delay",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, DLY, page 67",
    ),
    ("RVB", "rvb_room"): (
        "Room",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, RVB, page 68",
    ),
    ("RVB", "rvb_plate"): (
        "Plate",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, RVB, page 68",
    ),
    ("RVB", "rvb_tube_spring"): (
        "Tube Spring",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, RVB, page 68",
    ),
    ("VOL", "vol_volume"): (
        "Volume",
        "Valeton GP-200 Online Manual EN Firmware V1.8.0, Effect List, VOL, page 70",
    ),
}


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


def test_existing_seed_effects_remain_unverified():
    profile = load_gp200_profile()

    for module_name, effect_id in EXPECTED_SEED_EFFECTS:
        effect = profile["modules"][module_name]["effects"][effect_id]
        assert effect["id"] == effect_id
        assert effect["display_name"]
        assert effect["category"]
        assert effect["verified"] is False
        assert effect["source"] == "seed_profile"
        assert effect["source_note"] == SEED_SOURCE_NOTE
        assert effect.get("official_effect_name") is None
        assert isinstance(effect["parameters"], dict)
        assert effect["parameters"]


def test_verified_effect_batch_001_has_required_metadata():
    profile = load_gp200_profile()
    verified_effects = {
        (module_name, effect_id)
        for module_name, module in profile["modules"].items()
        for effect_id, effect in module["effects"].items()
        if effect["verified"] is True
    }

    assert verified_effects == set(EXPECTED_VERIFIED_BATCH_001)

    for (module_name, effect_id), (
        official_effect_name,
        source_detail,
    ) in EXPECTED_VERIFIED_BATCH_001.items():
        effect = profile["modules"][module_name]["effects"][effect_id]
        assert effect["id"] == effect_id
        assert effect["verified"] is True
        assert effect["official_effect_name"] == official_effect_name
        assert effect["source"] in ALLOWED_EFFECT_SOURCES
        assert effect["source"] == "manual"
        assert effect["source_detail"] == source_detail
        assert "parameter details are pending verification" in effect["source_note"]
        assert isinstance(effect["parameters"], dict)
        assert effect["parameters"]
        for parameter in effect["parameters"].values():
            assert parameter == {"min": 0, "max": 100, "default": 50}


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


def test_gp200_effect_coverage_counts_seed_and_verified_effects():
    coverage = get_gp200_effect_coverage(load_gp200_profile())

    assert coverage == {
        "total_effects": 65,
        "verified_effects": 47,
        "unverified_effects": 18,
        "sources": {"seed_profile": 18, "manual": 47},
    }
