import pytest
from pydantic import ValidationError

from app.schemas.scenarios import ScenarioExportPayload, ScenarioPayload


VALID_SCENARIO = {
    "name": "Quick Sort Demo",
    "module_type": "sorting",
    "algorithm_key": "quicksort",
    "input_payload": {"array": [3, 1, 2]},
    "algorithm_config": {"pivot": "last"},
}


def test_scenario_payload_accepts_guest_scenario_shape():
    scenario = ScenarioPayload.model_validate(VALID_SCENARIO)

    assert scenario.name == "Quick Sort Demo"
    assert scenario.module_type == "sorting"
    assert scenario.algorithm_key == "quicksort"
    assert scenario.input_payload == {"array": [3, 1, 2]}
    assert scenario.algorithm_config == {"pivot": "last"}


def test_scenario_payload_rejects_unexpected_top_level_fields():
    with pytest.raises(ValidationError):
        ScenarioPayload.model_validate({**VALID_SCENARIO, "unexpected": True})


def test_scenario_export_payload_requires_export_metadata():
    with pytest.raises(ValidationError):
        ScenarioExportPayload.model_validate(VALID_SCENARIO)


def test_scenario_export_payload_parses_id_and_timestamp():
    exported = ScenarioExportPayload.model_validate(
        {
            **VALID_SCENARIO,
            "id": "scenario-123",
            "created_at": "2026-03-24T12:00:00Z",
        }
    )

    assert exported.id == "scenario-123"
    assert exported.created_at.year == 2026
    assert exported.created_at.month == 3
    assert exported.created_at.day == 24
