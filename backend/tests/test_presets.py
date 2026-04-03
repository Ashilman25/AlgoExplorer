import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.data.presets import PRESETS
from app.routes.presets import ALGORITHM_CATEGORY
from app.schemas.presets import PresetItem


@pytest.fixture
def client():
    return TestClient(app)


# ─── Graph Presets ────────────────────────────────────────


class TestGraphPresetsUnfiltered:

    def test_returns_all_graph_presets(self, client):
        r = client.get("/api/presets/graph")
        assert r.status_code == 200
        data = r.json()
        assert data["module_type"] == "graph"
        assert len(data["groups"]) == 1
        assert data["groups"][0]["group_key"] == "general"

    def test_graph_preset_count_matches_data(self, client):
        r = client.get("/api/presets/graph")
        presets = r.json()["groups"][0]["presets"]
        assert len(presets) == len(PRESETS["graph"]["general"])

    def test_graph_presets_have_required_fields(self, client):
        r = client.get("/api/presets/graph")
        for preset in r.json()["groups"][0]["presets"]:
            assert "key" in preset
            assert "label" in preset
            assert "input_payload" in preset
            assert isinstance(preset["input_payload"], dict)
            assert len(preset["input_payload"]) > 0

    def test_graph_presets_have_tags(self, client):
        r = client.get("/api/presets/graph")
        for preset in r.json()["groups"][0]["presets"]:
            assert "tags" in preset
            assert isinstance(preset["tags"], list)
            assert len(preset["tags"]) >= 1

    def test_graph_preset_keys_are_unique(self, client):
        r = client.get("/api/presets/graph")
        keys = [p["key"] for p in r.json()["groups"][0]["presets"]]
        assert len(keys) == len(set(keys))


class TestGraphPresetsFiltered:

    def test_pathfinding_filter_returns_pathfinding_presets(self, client):
        r = client.get("/api/presets/graph", params = {"algorithm_key": "dijkstra"})
        assert r.status_code == 200
        presets = r.json()["groups"][0]["presets"]
        for p in presets:
            assert "pathfinding" in p["tags"] or not p["tags"]

    def test_pathfinding_excludes_mst_and_ordering(self, client):
        r = client.get("/api/presets/graph", params = {"algorithm_key": "bfs"})
        keys = {p["key"] for p in r.json()["groups"][0]["presets"]}
        assert "mst-demo" not in keys
        assert "dag-prereqs" not in keys
        assert "dag-cycle" not in keys

    def test_mst_filter_returns_mst_presets(self, client):
        r = client.get("/api/presets/graph", params = {"algorithm_key": "prims"})
        assert r.status_code == 200
        presets = r.json()["groups"][0]["presets"]
        assert len(presets) >= 1
        for p in presets:
            assert "mst" in p["tags"] or not p["tags"]

    def test_kruskals_returns_same_as_prims(self, client):
        r_prims = client.get("/api/presets/graph", params = {"algorithm_key": "prims"})
        r_kruskal = client.get("/api/presets/graph", params = {"algorithm_key": "kruskals"})
        assert r_prims.json() == r_kruskal.json()

    def test_ordering_filter_returns_dag_presets(self, client):
        r = client.get("/api/presets/graph", params = {"algorithm_key": "topological_sort"})
        assert r.status_code == 200
        keys = {p["key"] for p in r.json()["groups"][0]["presets"]}
        assert "dag-prereqs" in keys
        assert "dag-cycle" in keys
        assert "bfs-demo" not in keys

    @pytest.mark.parametrize("algorithm_key", list(ALGORITHM_CATEGORY.keys()))
    def test_all_known_graph_algorithms_return_200(self, client, algorithm_key):
        r = client.get("/api/presets/graph", params = {"algorithm_key": algorithm_key})
        assert r.status_code == 200
        assert len(r.json()["groups"]) >= 1

    def test_unknown_graph_algorithm_returns_404(self, client):
        r = client.get("/api/presets/graph", params = {"algorithm_key": "nonexistent"})
        assert r.status_code == 404


# ─── DP Presets ───────────────────────────────────────────


class TestDpPresetsUnfiltered:

    def test_returns_all_dp_groups(self, client):
        r = client.get("/api/presets/dp")
        assert r.status_code == 200
        data = r.json()
        assert data["module_type"] == "dp"
        group_keys = {g["group_key"] for g in data["groups"]}
        assert group_keys == {"lcs", "edit_distance", "knapsack_01", "coin_change", "fibonacci"}

    def test_dp_preset_counts_match_data(self, client):
        r = client.get("/api/presets/dp")
        for group in r.json()["groups"]:
            expected = len(PRESETS["dp"][group["group_key"]])
            assert len(group["presets"]) == expected


class TestDpPresetsFiltered:

    def test_lcs_returns_string_pair_presets(self, client):
        r = client.get("/api/presets/dp", params = {"algorithm_key": "lcs"})
        assert r.status_code == 200
        data = r.json()
        assert len(data["groups"]) == 1
        assert data["groups"][0]["group_key"] == "lcs"
        for p in data["groups"][0]["presets"]:
            assert "string1" in p["input_payload"]
            assert "string2" in p["input_payload"]

    def test_edit_distance_returns_string_pair_presets(self, client):
        r = client.get("/api/presets/dp", params = {"algorithm_key": "edit_distance"})
        assert r.status_code == 200
        assert r.json()["groups"][0]["group_key"] == "edit_distance"
        for p in r.json()["groups"][0]["presets"]:
            assert "string1" in p["input_payload"]
            assert "string2" in p["input_payload"]

    def test_knapsack_returns_capacity_and_items(self, client):
        r = client.get("/api/presets/dp", params = {"algorithm_key": "knapsack_01"})
        assert r.status_code == 200
        assert r.json()["groups"][0]["group_key"] == "knapsack_01"
        for p in r.json()["groups"][0]["presets"]:
            payload = p["input_payload"]
            assert "capacity" in payload
            assert "items" in payload
            assert isinstance(payload["items"], list)
            for item in payload["items"]:
                assert "weight" in item
                assert "value" in item

    def test_coin_change_returns_coins_and_target(self, client):
        r = client.get("/api/presets/dp", params = {"algorithm_key": "coin_change"})
        assert r.status_code == 200
        assert r.json()["groups"][0]["group_key"] == "coin_change"
        for p in r.json()["groups"][0]["presets"]:
            payload = p["input_payload"]
            assert "coins" in payload
            assert "target" in payload
            assert isinstance(payload["coins"], list)

    def test_fibonacci_returns_n_value(self, client):
        r = client.get("/api/presets/dp", params = {"algorithm_key": "fibonacci"})
        assert r.status_code == 200
        assert r.json()["groups"][0]["group_key"] == "fibonacci"
        for p in r.json()["groups"][0]["presets"]:
            assert "n" in p["input_payload"]
            assert isinstance(p["input_payload"]["n"], int)

    def test_unknown_dp_algorithm_returns_404(self, client):
        r = client.get("/api/presets/dp", params = {"algorithm_key": "nonexistent"})
        assert r.status_code == 404


# ─── Error Cases ──────────────────────────────────────────


class TestPresetErrors:

    def test_unknown_module_returns_404(self, client):
        r = client.get("/api/presets/nonexistent")
        assert r.status_code == 404
        assert "NOT_FOUND" in r.json()["error"]["error_code"]

    def test_sorting_module_returns_404(self, client):
        """Sorting presets are not in the PRESETS dict (out of scope)."""
        r = client.get("/api/presets/sorting")
        assert r.status_code == 404


# ─── Data Integrity ───────────────────────────────────────


class TestPresetDataIntegrity:

    def test_all_presets_validate_against_schema(self):
        """Every preset in the data file must be parseable by PresetItem."""
        for module_type, groups in PRESETS.items():
            for group_key, presets in groups.items():
                for preset in presets:
                    item = PresetItem(**preset)
                    assert item.key
                    assert item.label
                    assert isinstance(item.input_payload, dict)
                    assert len(item.input_payload) > 0

    def test_graph_presets_have_valid_input_payloads(self):
        for preset in PRESETS["graph"]["general"]:
            payload = preset["input_payload"]
            assert "nodes" in payload
            assert "edges" in payload
            assert isinstance(payload["nodes"], list)
            assert isinstance(payload["edges"], list)
            assert len(payload["nodes"]) >= 2
            assert len(payload["edges"]) >= 1
            # every node has an id
            for node in payload["nodes"]:
                assert "id" in node
            # every edge has source and target
            for edge in payload["edges"]:
                assert "source" in edge
                assert "target" in edge

    def test_graph_preset_tags_are_valid_categories(self):
        valid_tags = {"pathfinding", "mst", "ordering"}
        for preset in PRESETS["graph"]["general"]:
            for tag in preset.get("tags", []):
                assert tag in valid_tags, f"Preset '{preset['key']}' has invalid tag '{tag}'"

    def test_preset_keys_unique_within_each_group(self):
        for module_type, groups in PRESETS.items():
            for group_key, presets in groups.items():
                keys = [p["key"] for p in presets]
                assert len(keys) == len(set(keys)), (
                    f"Duplicate keys in {module_type}/{group_key}: {keys}"
                )

    def test_weighted_presets_have_edge_weights(self):
        for preset in PRESETS["graph"]["general"]:
            payload = preset["input_payload"]
            if payload.get("weighted"):
                for edge in payload["edges"]:
                    assert "weight" in edge, (
                        f"Preset '{preset['key']}' is weighted but edge {edge} has no weight"
                    )
