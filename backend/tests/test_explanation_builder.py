import pytest

from app.simulation.explanation_builder import ExplanationBuilder
from app.schemas.timeline import StepExplanation


class TestExplanationBuilderNoneLevel:
    def test_returns_title_only(self):
        eb = ExplanationBuilder("none")
        result = eb.build(
            title = "Dequeue node A",
            body = "Exploring 3 neighbors. 2 nodes visited.",
            data_snapshot = {"queue": ["B", "C"]},
        )

        assert isinstance(result, StepExplanation)
        assert result.title == "Dequeue node A"
        assert result.body is None
        assert result.data_snapshot is None

    def test_returns_title_only_without_snapshot(self):
        eb = ExplanationBuilder("none")
        result = eb.build(
            title = "Initialize BFS",
            body = "Starting from node A.",
        )

        assert result.title == "Initialize BFS"
        assert result.body is None
        assert result.data_snapshot is None


class TestExplanationBuilderStandardLevel:
    def test_returns_title_and_body(self):
        eb = ExplanationBuilder("standard")
        result = eb.build(
            title = "Dequeue node A",
            body = "Exploring 3 neighbors. 2 nodes visited.",
            data_snapshot = {"queue": ["B", "C"]},
        )

        assert result.title == "Dequeue node A"
        assert result.body == "Exploring 3 neighbors. 2 nodes visited."
        assert result.data_snapshot is None

    def test_returns_title_and_body_without_snapshot(self):
        eb = ExplanationBuilder("standard")
        result = eb.build(
            title = "Compare elements",
            body = "arr[2] = 5 > pivot 3.",
        )

        assert result.title == "Compare elements"
        assert result.body == "arr[2] = 5 > pivot 3."
        assert result.data_snapshot is None


class TestExplanationBuilderDetailedLevel:
    def test_returns_all_fields(self):
        eb = ExplanationBuilder("detailed")
        snapshot = {"queue": ["B", "C"], "visited": ["A"]}
        result = eb.build(
            title = "Dequeue node A",
            body = "Exploring 3 neighbors. 2 nodes visited.",
            data_snapshot = snapshot,
        )

        assert result.title == "Dequeue node A"
        assert result.body == "Exploring 3 neighbors. 2 nodes visited."
        assert result.data_snapshot == snapshot

    def test_returns_title_and_body_when_no_snapshot_provided(self):
        eb = ExplanationBuilder("detailed")
        result = eb.build(
            title = "Initialize",
            body = "Starting algorithm.",
        )

        assert result.title == "Initialize"
        assert result.body == "Starting algorithm."
        assert result.data_snapshot is None


class TestExplanationBuilderModelDump:
    def test_none_level_excludes_none_fields(self):
        eb = ExplanationBuilder("none")
        result = eb.build(
            title = "Test",
            body = "Body text.",
            data_snapshot = {"key": "val"},
        )

        dumped = result.model_dump(exclude_none = True)
        assert dumped == {"title": "Test"}

    def test_standard_level_excludes_none_fields(self):
        eb = ExplanationBuilder("standard")
        result = eb.build(
            title = "Test",
            body = "Body text.",
            data_snapshot = {"key": "val"},
        )

        dumped = result.model_dump(exclude_none = True)
        assert dumped == {"title": "Test", "body": "Body text."}

    def test_detailed_level_includes_all(self):
        eb = ExplanationBuilder("detailed")
        result = eb.build(
            title = "Test",
            body = "Body text.",
            data_snapshot = {"key": "val"},
        )

        dumped = result.model_dump(exclude_none = True)
        assert dumped == {"title": "Test", "body": "Body text.", "data_snapshot": {"key": "val"}}
