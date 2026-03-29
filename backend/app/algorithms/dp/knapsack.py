import time

from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import KnapsackInputPayload, DPEvents
from app.simulation.explanation_builder import ExplanationBuilder
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
        eb = ExplanationBuilder(algo_input.explanation_level)

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

        def add_step(event_type, highlighted, explanation, current_cell = None, dependency_cells = None, traceback_path = None, pseudocode_lines: list[int] | None = None):
            s_payload = {
                "table": [list(row) for row in table],
                "cell_states": [list(row) for row in cell_states],
                "current_cell": list(current_cell) if current_cell else None,
                "dependency_cells": [list(c) for c in dependency_cells] if dependency_cells else [],
                "traceback_path": [list(c) for c in traceback_path] if traceback_path else [],
                "selected_items": [],
                "pseudocode_lines": pseudocode_lines or [],
            }

            step = TimelineStep(
                step_index = len(steps),
                event_type = event_type,
                state_payload = s_payload,
                highlighted_entities = highlighted,
                metrics_snapshot = dict(metrics),
                explanation = explanation,
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
            eb.build(
                title = f"Initialize Knapsack table ({rows} x {cols})",
                body = f"Capacity = {W}. {n} items. Base row and column filled with 0.",
                data_snapshot = {"table": [list(row) for row in table], "cell": [0, 0]},
            ),
            pseudocode_lines = [0, 1, 2, 3],
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
                    eb.build(
                        title = f"Compute cell ({i}, {j})",
                        body = f"Item {i} (w={w_i}, v={v_i}), capacity {j}.",
                        data_snapshot = {"cell": [i, j], "cell_value": None, "item_weight": w_i, "item_value": v_i, "remaining_capacity": j},
                    ),
                    current_cell = [i, j],
                    pseudocode_lines = [4, 5],
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
                        eb.build(
                            title = f"Item {i} fits (w={w_i} <= {j})",
                            body = f"Exclude = {exclude_val}. Include = dp[{i - 1}][{j - w_i}] + {v_i} = {include_val}.",
                            data_snapshot = {"cell": [i, j], "recurrence": "include" if include_val > exclude_val else "exclude", "item_weight": w_i, "item_value": v_i, "remaining_capacity": j - w_i},
                        ),
                        current_cell = [i, j],
                        dependency_cells = dep_cells,
                        pseudocode_lines = [6, 7],
                    )

                    cell_states[i - 1][j] = "visited"
                    cell_states[i - 1][j - w_i] = "visited"

                    new_val = max(exclude_val, include_val)
                    choice = f"include ({include_val})" if include_val > exclude_val else f"exclude ({exclude_val})"
                    fill_pseudocode = [7]

                else:
                    cell_states[i - 1][j] = "frontier"

                    add_step(
                        DPEvents.READ_DEPENDENCY,
                        [
                            HighlightedEntity(id = [i, j], state = "active", label = f"({i},{j})"),
                            HighlightedEntity(id = [i - 1, j], state = "frontier", label = str(exclude_val)),
                        ],
                        eb.build(
                            title = f"Item {i} too heavy (w={w_i} > {j})",
                            body = f"Must exclude. dp[{i - 1}][{j}] = {exclude_val}.",
                            data_snapshot = {"cell": [i, j], "recurrence": "exclude", "item_weight": w_i, "item_value": v_i, "remaining_capacity": j},
                        ),
                        current_cell = [i, j],
                        dependency_cells = [[i - 1, j]],
                        pseudocode_lines = [8, 9],
                    )

                    cell_states[i - 1][j] = "visited"

                    new_val = exclude_val
                    choice = "exclude (too heavy)"
                    fill_pseudocode = [9]

                table[i][j] = new_val
                cell_states[i][j] = "visited"
                metrics["cells_computed"] += 1

                add_step(
                    DPEvents.FILL_CELL,
                    [HighlightedEntity(id = [i, j], state = "visited", label = str(new_val))],
                    eb.build(
                        title = f"Fill cell ({i}, {j}) = {new_val}",
                        body = f"dp[{i}][{j}] = {new_val} (chose {choice}).",
                        data_snapshot = {"cell": [i, j], "cell_value": new_val, "recurrence": "include" if "include" in choice else "exclude"},
                    ),
                    current_cell = [i, j],
                    pseudocode_lines = fill_pseudocode,
                )

            row_vals = ", ".join(str(table[i][j]) for j in range(cols))
            add_step(
                DPEvents.ROW_COMPLETE,
                [HighlightedEntity(id = [i, 0], state = "visited", label = f"Row {i}")],
                eb.build(
                    title = f"Row {i} complete",
                    body = f"Item {i} (w={items[i - 1].weight}, v={items[i - 1].value}). {metrics['cells_computed']} cells computed.",
                    data_snapshot = {"table": [list(row) for row in table]},
                ),
                pseudocode_lines = [4],
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
            eb.build(
                title = f"Begin traceback from ({i}, {j})",
                body = f"Optimal value = {table[n][W]}. Tracing back to find selected items.",
                data_snapshot = {"cell": [i, j], "cell_value": table[n][W]},
            ),
            current_cell = [i, j],
            pseudocode_lines = [10],
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
                    eb.build(
                        title = f"Traceback: select Item {i}",
                        body = f"Item {i} (w={items[i - 1].weight}, v={items[i - 1].value}) was selected. Move to ({i - 1}, {j - items[i - 1].weight}).",
                        data_snapshot = {"cell": [i, j], "cell_value": table[i][j], "item_weight": items[i - 1].weight, "item_value": items[i - 1].value},
                    ),
                    current_cell = [i, j],
                    traceback_path = list(tb_path),
                    pseudocode_lines = [10],
                )

                j -= items[i - 1].weight
                i -= 1
            else:
                cell_states[i][j] = "source"

                add_step(
                    DPEvents.TRACEBACK_STEP,
                    [HighlightedEntity(id = [i, j], state = "source", label = str(table[i][j]))],
                    eb.build(
                        title = f"Traceback: skip Item {i}",
                        body = f"Item {i} was NOT selected. Move up to ({i - 1}, {j}).",
                        data_snapshot = {"cell": [i, j], "cell_value": table[i][j]},
                    ),
                    current_cell = [i, j],
                    traceback_path = list(tb_path),
                    pseudocode_lines = [10],
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
            eb.build(
                title = "Knapsack complete",
                body = f"Optimal value = {total_value}, weight = {total_weight}/{W}. {metrics['cells_computed']} cells computed.",
                data_snapshot = {"table": [list(row) for row in table], "cell_value": total_value},
            ),
            traceback_path = list(tb_path),
            pseudocode_lines = [10],
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
