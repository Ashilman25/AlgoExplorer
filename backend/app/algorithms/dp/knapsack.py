import time

from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import KnapsackInputPayload, DPEvents
from app.exceptions import DomainError


@register("dp", "knapsack_01")
class KnapsackAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "dp"

    @property
    def algorithm_key(self) -> str:
        return "knapsack_01"

    def run(self, algo_input: AlgorithmInput) -> AlgorithmOutput:
        explain = algo_input.explanation_level

        try:
            dp_input = KnapsackInputPayload.model_validate(algo_input.input_payload)
        except ValidationError as e:
            raise DomainError("Invalid knapsack_01 input.", details = {"errors": e.errors()})

        items = dp_input.items
        W = dp_input.capacity
        n = len(items)
        rows = n + 1
        cols = W + 1

        # simulation state
        table = [[None] * cols for _ in range(rows)]
        cell_states = [["default"] * cols for _ in range(rows)]

        steps: list[TimelineStep] = []
        metrics = {
            "cells_computed": 0,
            "table_rows": rows,
            "table_cols": cols,
            "total_value": 0,
            "total_weight": 0,
            "items_selected": 0,
            "subproblems_reused": 0,
            "runtime_ms": 0,
        }

        def add_step(event_type, highlighted, explanation, current_cell = None, dependency_cells = None, traceback_path = None):
            s_payload = {
                "table": [list(row) for row in table],
                "cell_states": [list(row) for row in cell_states],
                "current_cell": list(current_cell) if current_cell else None,
                "dependency_cells": [list(c) for c in dependency_cells] if dependency_cells else [],
                "traceback_path": [list(c) for c in traceback_path] if traceback_path else [],
                "selected_items": [],
            }

            step = TimelineStep(
                step_index = len(steps),
                event_type = event_type,
                state_payload = s_payload,
                highlighted_entities = highlighted,
                metrics_snapshot = dict(metrics),
                explanation = explanation if explain != "none" else None,
                timestamp_or_order = len(steps),
            )
            steps.append(step)

        # INITIALIZE — base cases: row 0 and col 0 all zeros
        for i in range(rows):
            table[i][0] = 0
            cell_states[i][0] = "visited"

        for j in range(cols):
            table[0][j] = 0
            cell_states[0][j] = "visited"

        items_desc = ", ".join(f"Item {i + 1}(w={it.weight}, v={it.value})" for i, it in enumerate(items))
        add_step(
            DPEvents.INITIALIZE,
            [HighlightedEntity(id = [0, 0], state = "visited", label = "Base cases")],
            f"Initialize 0/1 Knapsack table ({rows} x {cols}). "
            f"Capacity = {W}. Items: {items_desc}. "
            f"Base row and column filled with 0 — zero items or zero capacity means zero value.",
        )

        # FILL TABLE
        t_start = time.perf_counter()

        for i in range(1, rows):
            item = items[i - 1]
            w_i = item.weight
            v_i = item.value

            for j in range(1, cols):
                cell_states[i][j] = "active"

                add_step(
                    DPEvents.COMPUTE_CELL,
                    [HighlightedEntity(id = [i, j], state = "active", label = f"({i},{j})")],
                    f"Computing cell ({i}, {j}): Item {i} (w={w_i}, v={v_i}), capacity {j}.",
                    current_cell = [i, j],
                )

                exclude_val = table[i - 1][j]
                metrics["subproblems_reused"] += 1

                if w_i <= j:
                    include_val = table[i - 1][j - w_i] + v_i
                    metrics["subproblems_reused"] += 1

                    cell_states[i - 1][j] = "frontier"
                    cell_states[i - 1][j - w_i] = "frontier"

                    dep_cells = [[i - 1, j], [i - 1, j - w_i]]

                    add_step(
                        DPEvents.READ_DEPENDENCY,
                        [
                            HighlightedEntity(id = [i, j], state = "active", label = f"({i},{j})"),
                            HighlightedEntity(id = [i - 1, j], state = "frontier", label = str(exclude_val)),
                            HighlightedEntity(id = [i - 1, j - w_i], state = "frontier", label = str(include_val - v_i)),
                        ],
                        f"Item {i} fits (w={w_i} <= cap={j}). "
                        f"Exclude: dp[{i - 1}][{j}] = {exclude_val}. "
                        f"Include: dp[{i - 1}][{j - w_i}] + {v_i} = {include_val}.",
                        current_cell = [i, j],
                        dependency_cells = dep_cells,
                    )

                    cell_states[i - 1][j] = "visited"
                    cell_states[i - 1][j - w_i] = "visited"

                    new_val = max(exclude_val, include_val)
                    choice = f"include ({include_val})" if include_val > exclude_val else f"exclude ({exclude_val})"

                else:
                    cell_states[i - 1][j] = "frontier"

                    add_step(
                        DPEvents.READ_DEPENDENCY,
                        [
                            HighlightedEntity(id = [i, j], state = "active", label = f"({i},{j})"),
                            HighlightedEntity(id = [i - 1, j], state = "frontier", label = str(exclude_val)),
                        ],
                        f"Item {i} too heavy (w={w_i} > cap={j}). Must exclude. "
                        f"dp[{i - 1}][{j}] = {exclude_val}.",
                        current_cell = [i, j],
                        dependency_cells = [[i - 1, j]],
                    )

                    cell_states[i - 1][j] = "visited"

                    new_val = exclude_val
                    choice = "exclude (too heavy)"

                table[i][j] = new_val
                cell_states[i][j] = "visited"
                metrics["cells_computed"] += 1

                add_step(
                    DPEvents.FILL_CELL,
                    [HighlightedEntity(id = [i, j], state = "visited", label = str(new_val))],
                    f"dp[{i}][{j}] = {new_val} (chose {choice}).",
                    current_cell = [i, j],
                )

            row_vals = ", ".join(str(table[i][j]) for j in range(cols))
            add_step(
                DPEvents.ROW_COMPLETE,
                [HighlightedEntity(id = [i, 0], state = "visited", label = f"Row {i}")],
                f"Row {i} complete (Item {i}: w={items[i - 1].weight}, v={items[i - 1].value}): [{row_vals}].",
            )

        t_end = time.perf_counter()
        metrics["runtime_ms"] = round((t_end - t_start) * 1000, 3)

        # TRACEBACK — find which items were selected
        selected = []
        tb_path = []
        i, j = n, W

        cell_states[i][j] = "source"
        add_step(
            DPEvents.TRACEBACK_START,
            [HighlightedEntity(id = [i, j], state = "source", label = str(table[i][j]))],
            f"Begin traceback from cell ({i}, {j}) with optimal value = {table[n][W]}.",
            current_cell = [i, j],
        )

        while i > 0 and j > 0:
            if table[i][j] != table[i - 1][j]:
                # item i was included
                selected.append(i - 1)
                tb_path.append([i, j])
                cell_states[i][j] = "success"

                add_step(
                    DPEvents.TRACEBACK_STEP,
                    [HighlightedEntity(id = [i, j], state = "success", label = f"Item {i}")],
                    f"dp[{i}][{j}] = {table[i][j]} != dp[{i - 1}][{j}] = {table[i - 1][j]} — "
                    f"Item {i} (w={items[i - 1].weight}, v={items[i - 1].value}) was selected. "
                    f"Move to ({i - 1}, {j - items[i - 1].weight}).",
                    current_cell = [i, j],
                    traceback_path = list(tb_path),
                )

                j -= items[i - 1].weight
                i -= 1
            else:
                cell_states[i][j] = "source"

                add_step(
                    DPEvents.TRACEBACK_STEP,
                    [HighlightedEntity(id = [i, j], state = "source", label = str(table[i][j]))],
                    f"dp[{i}][{j}] = {table[i][j]} == dp[{i - 1}][{j}] = {table[i - 1][j]} — "
                    f"Item {i} was NOT selected. Move up to ({i - 1}, {j}).",
                    current_cell = [i, j],
                    traceback_path = list(tb_path),
                )

                i -= 1

        selected.reverse()
        total_weight = sum(items[idx].weight for idx in selected)
        total_value = table[n][W]
        metrics["total_value"] = total_value
        metrics["total_weight"] = total_weight
        metrics["items_selected"] = len(selected)

        # COMPLETE
        selected_desc = ", ".join(f"Item {idx + 1}(w={items[idx].weight}, v={items[idx].value})" for idx in selected)
        add_step(
            DPEvents.COMPLETE,
            [HighlightedEntity(id = [n, W], state = "success", label = str(total_value))],
            f"Knapsack complete! Optimal value = {total_value}, weight = {total_weight}/{W}. "
            f"Selected: {selected_desc if selected_desc else 'none'}. "
            f"{metrics['cells_computed']} cells computed in a {rows} x {cols} table.",
            traceback_path = list(tb_path),
        )

        final_result = {
            "optimal_value": total_value,
            "total_weight": total_weight,
            "selected_items": selected,
            "table_dimensions": [rows, cols],
        }

        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity": "O(nW)",
            "space_complexity": "O(nW)",
            "num_items": n,
            "capacity": W,
        }

        return AlgorithmOutput(
            timeline_steps = steps,
            final_result = final_result,
            summary_metrics = metrics,
            algorithm_metadata = alg_metadata,
        )
