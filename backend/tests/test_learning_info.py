import pytest
from app.data.registry import REGISTRY
from app.schemas.metadata import LearningInfo


REQUIRED_COMPLEXITY_FIELDS = {"best", "average", "worst"}


def all_algorithms():
    """Yield (module_key, alg_key, alg_data) for every algorithm in the registry."""
    for module_key, module_data in REGISTRY.items():
        for alg_key, alg_data in module_data["algorithms"].items():
            yield module_key, alg_key, alg_data


class TestLearningInfoCompleteness:
    """Every algorithm in the registry must have a valid learning_info entry."""

    @pytest.mark.parametrize(
        "module_key,alg_key,alg_data",
        list(all_algorithms()),
        ids = [f"{m}/{a}" for m, a, _ in all_algorithms()],
    )
    def test_learning_info_present(self, module_key, alg_key, alg_data):
        assert "learning_info" in alg_data, (
            f"{module_key}/{alg_key} is missing learning_info"
        )
        assert alg_data["learning_info"] is not None

    @pytest.mark.parametrize(
        "module_key,alg_key,alg_data",
        list(all_algorithms()),
        ids = [f"{m}/{a}" for m, a, _ in all_algorithms()],
    )
    def test_learning_info_validates_against_schema(self, module_key, alg_key, alg_data):
        info = alg_data["learning_info"]
        parsed = LearningInfo(**info)
        assert parsed.complexity.time.best
        assert parsed.complexity.time.average
        assert parsed.complexity.time.worst
        assert parsed.complexity.space
        assert len(parsed.properties) >= 1
        assert len(parsed.insights) >= 1
        assert len(parsed.use_cases.use_when) >= 1
        assert len(parsed.use_cases.avoid_when) >= 1
        assert parsed.scenarios.best_case
        assert parsed.scenarios.worst_case
