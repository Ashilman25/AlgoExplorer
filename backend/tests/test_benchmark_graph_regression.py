import random

from app.benchmark.graph_inputs import generate_graph_input
from app.simulation.types import AlgorithmInput
from app.algorithms.graph.bfs import BFSAlgorithm
from app.algorithms.graph.dfs import DFSAlgorithm
from app.algorithms.graph.dijkstra import DijkstraAlgorithm
from app.algorithms.graph.astar import AStarAlgorithm
from app.algorithms.graph.bellman_ford import BellmanFordAlgorithm
from app.algorithms.graph.prims import PrimsAlgorithm
from app.algorithms.graph.kruskals import KruskalsAlgorithm
from app.algorithms.graph.topological_sort import TopologicalSortAlgorithm


def _run_benchmark(algo_class, payload):
    algo = algo_class()
    algo_input = AlgorithmInput(
        input_payload = payload,
        execution_mode = "benchmark",
        explanation_level = "none",
    )
    return algo.run(algo_input)


class TestBFSBenchmarkRegression:
    def test_metrics_are_consistent(self):
        random.seed(42)
        payload = generate_graph_input("sparse_random", 100, "traversal", ["bfs"])
        output = _run_benchmark(BFSAlgorithm, payload)
        m = output.summary_metrics
        assert m["nodes_visited"] > 0
        assert m["edges_explored"] > 0
        assert m["frontier_size"] >= 0
        assert output.timeline_steps == []

    def test_target_found(self):
        random.seed(42)
        payload = generate_graph_input("tree", 50, "traversal", ["bfs"])
        output = _run_benchmark(BFSAlgorithm, payload)
        assert output.final_result["path_found"] is True


class TestDFSBenchmarkRegression:
    def test_metrics_are_consistent(self):
        random.seed(42)
        payload = generate_graph_input("sparse_random", 100, "traversal", ["dfs"])
        output = _run_benchmark(DFSAlgorithm, payload)
        m = output.summary_metrics
        assert m["nodes_visited"] > 0
        assert m["edges_explored"] > 0
        assert m["stack_max_size"] >= 1
        assert output.timeline_steps == []


class TestDijkstraBenchmarkRegression:
    def test_metrics_are_consistent(self):
        random.seed(42)
        payload = generate_graph_input("sparse_random", 100, "shortest_path", ["dijkstra"])
        output = _run_benchmark(DijkstraAlgorithm, payload)
        m = output.summary_metrics
        assert m["nodes_visited"] > 0
        assert m["edges_explored"] > 0
        assert m["relaxations"] > 0
        assert output.timeline_steps == []


class TestAStarBenchmarkRegression:
    def test_metrics_are_consistent(self):
        random.seed(42)
        payload = generate_graph_input("sparse_random", 100, "shortest_path", ["astar"])
        output = _run_benchmark(AStarAlgorithm, payload)
        m = output.summary_metrics
        assert m["nodes_visited"] > 0
        assert m["edges_explored"] > 0
        assert m["heap_max_size"] >= 1
        assert output.timeline_steps == []


class TestBellmanFordBenchmarkRegression:
    def test_metrics_are_consistent(self):
        random.seed(42)
        payload = generate_graph_input("sparse_random", 50, "shortest_path", ["bellman_ford"])
        output = _run_benchmark(BellmanFordAlgorithm, payload)
        m = output.summary_metrics
        assert m["edges_processed"] > 0
        assert m["relaxation_count"] > 0
        assert m["passes_completed"] == 49
        assert output.timeline_steps == []


class TestPrimsBenchmarkRegression:
    def test_metrics_are_consistent(self):
        random.seed(42)
        payload = generate_graph_input("sparse_random", 100, "mst", ["prims"])
        output = _run_benchmark(PrimsAlgorithm, payload)
        m = output.summary_metrics
        assert m["edges_added"] == 99
        assert m["mst_total_weight"] > 0
        assert m["nodes_in_tree"] == 100
        assert output.timeline_steps == []


class TestKruskalsBenchmarkRegression:
    def test_metrics_are_consistent(self):
        random.seed(42)
        payload = generate_graph_input("sparse_random", 100, "mst", ["kruskals"])
        output = _run_benchmark(KruskalsAlgorithm, payload)
        m = output.summary_metrics
        assert m["edges_considered"] > 0
        assert m["edges_added"] == 99
        assert m["mst_total_weight"] > 0
        assert output.timeline_steps == []


class TestTopologicalSortBenchmarkRegression:
    def test_metrics_are_consistent(self):
        random.seed(42)
        payload = generate_graph_input("chain", 100, "ordering", ["topological_sort"])
        output = _run_benchmark(TopologicalSortAlgorithm, payload)
        m = output.summary_metrics
        assert m["nodes_ordered"] == 100
        assert m["edges_processed"] == 99
        assert output.timeline_steps == []

    def test_dag_ordering(self):
        random.seed(42)
        payload = generate_graph_input("layered_dag", 50, "ordering", ["topological_sort"])
        output = _run_benchmark(TopologicalSortAlgorithm, payload)
        assert output.final_result["cycle_detected"] is False
        assert output.final_result["nodes_ordered"] == 50


# ---------------------------------------------------------------------------
# Cross-validation: benchmark path must match simulation path on key metrics
# ---------------------------------------------------------------------------

def _run_simulate(algo_class, payload):
    algo = algo_class()
    algo_input = AlgorithmInput(
        input_payload = payload,
        execution_mode = "simulate",
        explanation_level = "none",
    )
    return algo.run(algo_input)


class TestBFSCrossValidation:
    def test_benchmark_matches_simulation(self):
        random.seed(99)
        payload = generate_graph_input("sparse_random", 50, "traversal", ["bfs"])
        sim = _run_simulate(BFSAlgorithm, payload)
        bench = _run_benchmark(BFSAlgorithm, payload)
        assert bench.summary_metrics["nodes_visited"] == sim.summary_metrics["nodes_visited"]
        assert bench.summary_metrics["edges_explored"] == sim.summary_metrics["edges_explored"]

    def test_benchmark_matches_simulation_tree(self):
        random.seed(7)
        payload = generate_graph_input("tree", 40, "traversal", ["bfs"])
        sim = _run_simulate(BFSAlgorithm, payload)
        bench = _run_benchmark(BFSAlgorithm, payload)
        assert bench.summary_metrics["nodes_visited"] == sim.summary_metrics["nodes_visited"]
        assert bench.summary_metrics["edges_explored"] == sim.summary_metrics["edges_explored"]


class TestDFSCrossValidation:
    def test_benchmark_matches_simulation(self):
        random.seed(99)
        payload = generate_graph_input("sparse_random", 50, "traversal", ["dfs"])
        sim = _run_simulate(DFSAlgorithm, payload)
        bench = _run_benchmark(DFSAlgorithm, payload)
        assert bench.summary_metrics["nodes_visited"] == sim.summary_metrics["nodes_visited"]
        assert bench.summary_metrics["edges_explored"] == sim.summary_metrics["edges_explored"]

    def test_benchmark_matches_simulation_dense(self):
        random.seed(13)
        payload = generate_graph_input("dense_random", 30, "traversal", ["dfs"])
        sim = _run_simulate(DFSAlgorithm, payload)
        bench = _run_benchmark(DFSAlgorithm, payload)
        assert bench.summary_metrics["nodes_visited"] == sim.summary_metrics["nodes_visited"]
        assert bench.summary_metrics["edges_explored"] == sim.summary_metrics["edges_explored"]


class TestDijkstraCrossValidation:
    def test_benchmark_matches_simulation(self):
        random.seed(99)
        payload = generate_graph_input("sparse_random", 50, "shortest_path", ["dijkstra"])
        sim = _run_simulate(DijkstraAlgorithm, payload)
        bench = _run_benchmark(DijkstraAlgorithm, payload)
        assert bench.summary_metrics["nodes_visited"] == sim.summary_metrics["nodes_visited"]
        assert bench.summary_metrics["edges_explored"] == sim.summary_metrics["edges_explored"]
        assert bench.summary_metrics["relaxations"] == sim.summary_metrics["relaxations"]

    def test_benchmark_matches_simulation_grid(self):
        random.seed(5)
        payload = generate_graph_input("grid", 25, "shortest_path", ["dijkstra"])
        sim = _run_simulate(DijkstraAlgorithm, payload)
        bench = _run_benchmark(DijkstraAlgorithm, payload)
        assert bench.summary_metrics["nodes_visited"] == sim.summary_metrics["nodes_visited"]
        assert bench.summary_metrics["edges_explored"] == sim.summary_metrics["edges_explored"]
        assert bench.summary_metrics["relaxations"] == sim.summary_metrics["relaxations"]


class TestAStarCrossValidation:
    def test_benchmark_matches_simulation(self):
        random.seed(99)
        payload = generate_graph_input("sparse_random", 50, "shortest_path", ["astar"])
        sim = _run_simulate(AStarAlgorithm, payload)
        bench = _run_benchmark(AStarAlgorithm, payload)
        assert bench.summary_metrics["nodes_visited"] == sim.summary_metrics["nodes_visited"]
        assert bench.summary_metrics["edges_explored"] == sim.summary_metrics["edges_explored"]

    def test_benchmark_matches_simulation_grid(self):
        random.seed(5)
        payload = generate_graph_input("grid", 25, "shortest_path", ["astar"])
        sim = _run_simulate(AStarAlgorithm, payload)
        bench = _run_benchmark(AStarAlgorithm, payload)
        assert bench.summary_metrics["nodes_visited"] == sim.summary_metrics["nodes_visited"]
        assert bench.summary_metrics["edges_explored"] == sim.summary_metrics["edges_explored"]


class TestBellmanFordCrossValidation:
    def test_benchmark_matches_simulation_no_negative_cycle(self):
        # Use seed that produces no negative cycle; verify before comparing
        random.seed(99)
        payload = generate_graph_input("sparse_random", 30, "shortest_path", ["bellman_ford"])
        sim = _run_simulate(BellmanFordAlgorithm, payload)
        bench = _run_benchmark(BellmanFordAlgorithm, payload)
        # Only compare when no negative cycle so detection-pass counts are stable
        if not sim.final_result.get("negative_cycle_detected"):
            assert bench.summary_metrics["edges_processed"] == sim.summary_metrics["edges_processed"]
            assert bench.summary_metrics["relaxation_count"] == sim.summary_metrics["relaxation_count"]
        assert bench.summary_metrics["passes_completed"] == sim.summary_metrics["passes_completed"]

    def test_benchmark_matches_simulation_tree(self):
        random.seed(7)
        payload = generate_graph_input("tree", 20, "shortest_path", ["bellman_ford"])
        sim = _run_simulate(BellmanFordAlgorithm, payload)
        bench = _run_benchmark(BellmanFordAlgorithm, payload)
        assert bench.summary_metrics["passes_completed"] == sim.summary_metrics["passes_completed"]
        assert bench.summary_metrics["relaxation_count"] == sim.summary_metrics["relaxation_count"]


class TestPrimsCrossValidation:
    def test_benchmark_matches_simulation(self):
        random.seed(99)
        payload = generate_graph_input("sparse_random", 50, "mst", ["prims"])
        sim = _run_simulate(PrimsAlgorithm, payload)
        bench = _run_benchmark(PrimsAlgorithm, payload)
        assert bench.summary_metrics["edges_added"] == sim.summary_metrics["edges_added"]
        assert bench.summary_metrics["nodes_in_tree"] == sim.summary_metrics["nodes_in_tree"]
        assert abs(bench.summary_metrics["mst_total_weight"] - sim.summary_metrics["mst_total_weight"]) < 1e-9

    def test_benchmark_matches_simulation_complete(self):
        random.seed(3)
        payload = generate_graph_input("complete", 10, "mst", ["prims"])
        sim = _run_simulate(PrimsAlgorithm, payload)
        bench = _run_benchmark(PrimsAlgorithm, payload)
        assert bench.summary_metrics["edges_added"] == sim.summary_metrics["edges_added"]
        assert bench.summary_metrics["nodes_in_tree"] == sim.summary_metrics["nodes_in_tree"]
        assert abs(bench.summary_metrics["mst_total_weight"] - sim.summary_metrics["mst_total_weight"]) < 1e-9


class TestKruskalsCrossValidation:
    def test_benchmark_matches_simulation(self):
        random.seed(99)
        payload = generate_graph_input("sparse_random", 50, "mst", ["kruskals"])
        sim = _run_simulate(KruskalsAlgorithm, payload)
        bench = _run_benchmark(KruskalsAlgorithm, payload)
        assert bench.summary_metrics["edges_considered"] == sim.summary_metrics["edges_considered"]
        assert bench.summary_metrics["edges_added"] == sim.summary_metrics["edges_added"]
        assert abs(bench.summary_metrics["mst_total_weight"] - sim.summary_metrics["mst_total_weight"]) < 1e-9

    def test_benchmark_matches_simulation_dense(self):
        random.seed(11)
        payload = generate_graph_input("dense_random", 20, "mst", ["kruskals"])
        sim = _run_simulate(KruskalsAlgorithm, payload)
        bench = _run_benchmark(KruskalsAlgorithm, payload)
        assert bench.summary_metrics["edges_considered"] == sim.summary_metrics["edges_considered"]
        assert bench.summary_metrics["edges_added"] == sim.summary_metrics["edges_added"]
        assert abs(bench.summary_metrics["mst_total_weight"] - sim.summary_metrics["mst_total_weight"]) < 1e-9


class TestTopologicalSortCrossValidation:
    def test_benchmark_matches_simulation_chain(self):
        random.seed(99)
        payload = generate_graph_input("chain", 50, "ordering", ["topological_sort"])
        sim = _run_simulate(TopologicalSortAlgorithm, payload)
        bench = _run_benchmark(TopologicalSortAlgorithm, payload)
        assert bench.summary_metrics["nodes_ordered"] == sim.summary_metrics["nodes_ordered"]
        assert bench.summary_metrics["edges_processed"] == sim.summary_metrics["edges_processed"]

    def test_benchmark_matches_simulation_sparse_dag(self):
        random.seed(17)
        payload = generate_graph_input("sparse_dag", 40, "ordering", ["topological_sort"])
        sim = _run_simulate(TopologicalSortAlgorithm, payload)
        bench = _run_benchmark(TopologicalSortAlgorithm, payload)
        assert bench.summary_metrics["nodes_ordered"] == sim.summary_metrics["nodes_ordered"]
        assert bench.summary_metrics["edges_processed"] == sim.summary_metrics["edges_processed"]


# ---------------------------------------------------------------------------
# Multi-family regression: each algorithm on additional input families
# ---------------------------------------------------------------------------

class TestBFSMultiFamilyRegression:
    def test_dense_random(self):
        random.seed(42)
        payload = generate_graph_input("dense_random", 30, "traversal", ["bfs"])
        output = _run_benchmark(BFSAlgorithm, payload)
        assert output.summary_metrics["nodes_visited"] > 0
        assert output.timeline_steps == []

    def test_complete(self):
        random.seed(42)
        payload = generate_graph_input("complete", 15, "traversal", ["bfs"])
        output = _run_benchmark(BFSAlgorithm, payload)
        assert output.summary_metrics["nodes_visited"] > 0
        assert output.timeline_steps == []


class TestDFSMultiFamilyRegression:
    def test_tree(self):
        random.seed(42)
        payload = generate_graph_input("tree", 50, "traversal", ["dfs"])
        output = _run_benchmark(DFSAlgorithm, payload)
        assert output.summary_metrics["nodes_visited"] > 0
        assert output.timeline_steps == []

    def test_complete(self):
        random.seed(42)
        payload = generate_graph_input("complete", 15, "traversal", ["dfs"])
        output = _run_benchmark(DFSAlgorithm, payload)
        assert output.summary_metrics["nodes_visited"] > 0
        assert output.timeline_steps == []


class TestDijkstraMultiFamilyRegression:
    def test_tree(self):
        random.seed(42)
        payload = generate_graph_input("tree", 50, "shortest_path", ["dijkstra"])
        output = _run_benchmark(DijkstraAlgorithm, payload)
        assert output.summary_metrics["nodes_visited"] > 0
        assert output.timeline_steps == []

    def test_grid(self):
        random.seed(42)
        payload = generate_graph_input("grid", 25, "shortest_path", ["dijkstra"])
        output = _run_benchmark(DijkstraAlgorithm, payload)
        assert output.summary_metrics["nodes_visited"] > 0
        assert output.timeline_steps == []


class TestAStarMultiFamilyRegression:
    def test_tree(self):
        random.seed(42)
        payload = generate_graph_input("tree", 50, "shortest_path", ["astar"])
        output = _run_benchmark(AStarAlgorithm, payload)
        assert output.summary_metrics["nodes_visited"] > 0
        assert output.timeline_steps == []

    def test_grid(self):
        random.seed(42)
        payload = generate_graph_input("grid", 25, "shortest_path", ["astar"])
        output = _run_benchmark(AStarAlgorithm, payload)
        assert output.summary_metrics["nodes_visited"] > 0
        assert output.timeline_steps == []


class TestPrimsMultiFamilyRegression:
    def test_tree_10_nodes(self):
        random.seed(42)
        payload = generate_graph_input("tree", 10, "mst", ["prims"])
        output = _run_benchmark(PrimsAlgorithm, payload)
        assert output.summary_metrics["edges_added"] == 9
        assert output.summary_metrics["nodes_in_tree"] == 10
        assert output.timeline_steps == []

    def test_complete_10_nodes(self):
        random.seed(42)
        payload = generate_graph_input("complete", 10, "mst", ["prims"])
        output = _run_benchmark(PrimsAlgorithm, payload)
        assert output.summary_metrics["edges_added"] == 9
        assert output.summary_metrics["nodes_in_tree"] == 10
        assert output.timeline_steps == []


class TestKruskalsMultiFamilyRegression:
    def test_tree_10_nodes(self):
        random.seed(42)
        payload = generate_graph_input("tree", 10, "mst", ["kruskals"])
        output = _run_benchmark(KruskalsAlgorithm, payload)
        assert output.summary_metrics["edges_added"] == 9
        assert output.timeline_steps == []

    def test_dense_random(self):
        random.seed(42)
        payload = generate_graph_input("dense_random", 20, "mst", ["kruskals"])
        output = _run_benchmark(KruskalsAlgorithm, payload)
        assert output.summary_metrics["edges_added"] == 19
        assert output.timeline_steps == []


class TestTopologicalSortMultiFamilyRegression:
    def test_sparse_dag_10_nodes(self):
        random.seed(42)
        payload = generate_graph_input("sparse_dag", 10, "ordering", ["topological_sort"])
        output = _run_benchmark(TopologicalSortAlgorithm, payload)
        assert output.summary_metrics["nodes_ordered"] == 10
        assert output.final_result["cycle_detected"] is False
        assert output.timeline_steps == []

    def test_dense_dag(self):
        random.seed(42)
        payload = generate_graph_input("dense_dag", 30, "ordering", ["topological_sort"])
        output = _run_benchmark(TopologicalSortAlgorithm, payload)
        assert output.summary_metrics["nodes_ordered"] == 30
        assert output.final_result["cycle_detected"] is False
        assert output.timeline_steps == []

    def test_layered_dag_10_nodes(self):
        random.seed(42)
        payload = generate_graph_input("layered_dag", 10, "ordering", ["topological_sort"])
        output = _run_benchmark(TopologicalSortAlgorithm, payload)
        assert output.summary_metrics["nodes_ordered"] == 10
        assert output.final_result["cycle_detected"] is False
        assert output.timeline_steps == []
