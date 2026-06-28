from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml


GP200_DATA_DIR = Path(__file__).resolve().parents[1] / "devices" / "gp200"


@dataclass(frozen=True)
class ValidationResult:
    valid: bool
    warnings: list[str]
    errors: list[str]


@lru_cache
def load_gp200_profile() -> dict[str, Any]:
    return load_yaml("gp200_profile.yaml")


@lru_cache
def load_connection_rules() -> dict[str, Any]:
    return load_yaml("connection_rules.yaml")["connection_modes"]


def validate_gp200_patch(patch: dict[str, Any]) -> ValidationResult:
    profile = load_gp200_profile()
    rules = load_connection_rules()
    errors: list[str] = []
    warnings = list(patch.get("warnings", []))

    required_fields = [
        "device",
        "model",
        "tone_goal",
        "pickup_type",
        "connection_mode",
        "signal_chain",
        "modules",
        "warnings",
        "summary",
    ]
    for field in required_fields:
        if field not in patch:
            errors.append(f"Missing required field: {field}")

    modules = patch.get("modules")
    if not isinstance(modules, dict):
        errors.append("Missing required field: modules")
        return ValidationResult(valid=False, warnings=warnings, errors=errors)

    profile_modules = profile["modules"]
    for module_name in patch.get("signal_chain", []):
        if module_name not in profile_modules:
            errors.append(f"Unknown module in signal chain: {module_name}")

    for module_name, module_patch in modules.items():
        if module_name not in profile_modules:
            errors.append(f"Unknown module: {module_name}")
            continue
        validate_module(module_name, module_patch, profile_modules[module_name], errors)

    connection_mode = str(patch.get("connection_mode", ""))
    if connection_mode not in rules:
        errors.append(f"Unknown connection mode: {connection_mode}")
    else:
        validate_connection_mode_states(connection_mode, modules, rules, errors)

    return ValidationResult(valid=len(errors) == 0, warnings=warnings, errors=errors)


def validate_module(
    module_name: str,
    module_patch: dict[str, Any],
    module_profile: dict[str, Any],
    errors: list[str],
) -> None:
    for field in ["enabled", "effect", "parameters"]:
        if field not in module_patch:
            errors.append(f"Missing {field} for module: {module_name}")

    effect = module_patch.get("effect")
    effects = module_profile["effects"]
    if effect not in effects:
        errors.append(f"Unknown effect for {module_name}: {effect}")
        return

    parameters = module_patch.get("parameters")
    if not isinstance(parameters, dict):
        return

    parameter_rules = effects[effect]["parameters"]
    for parameter_name, value in parameters.items():
        if parameter_name not in parameter_rules:
            errors.append(f"Unknown parameter for {module_name}.{effect}: {parameter_name}")
            continue

        min_value = parameter_rules[parameter_name]["min"]
        max_value = parameter_rules[parameter_name]["max"]
        if not isinstance(value, (int, float)) or not min_value <= value <= max_value:
            errors.append(
                f"Parameter out of range for {module_name}.{effect}.{parameter_name}: "
                f"{value} not in {min_value}..{max_value}"
            )


def validate_connection_mode_states(
    connection_mode: str,
    modules: dict[str, dict[str, Any]],
    rules: dict[str, Any],
    errors: list[str],
) -> None:
    connection_rule = rules[connection_mode]
    expected_states = {
        "AMP": connection_rule["amp_enabled"],
        "CAB": connection_rule["cab_enabled"],
    }

    for module_name, expected_enabled in expected_states.items():
        module_patch = modules.get(module_name)
        if module_patch is None:
            errors.append(f"Missing required module for connection rule: {module_name}")
            continue
        if module_patch.get("enabled") is not expected_enabled:
            errors.append(
                f"{module_name} enabled state does not match connection rule "
                f"for {connection_mode}: expected {expected_enabled}"
            )


def load_yaml(filename: str) -> dict[str, Any]:
    with (GP200_DATA_DIR / filename).open() as file:
        return yaml.safe_load(file)
