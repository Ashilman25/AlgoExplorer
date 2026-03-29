import time

from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import DPStringInputPayload, DPEvents
from app.simulation.explanation_builder import ExplanationBuilder
from app.exceptions import DomainError


@register("dp", "edit_distance")
class EditDistanceAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "dp"

    @property
    def algorithm_key(self) -> str:
        return "edit_distance"


    def run(self, algo_input: AlgorithmInput) -> AlgorithmOutput:
        eb = ExplanationBuilder(algo_input.explanation_level)

        # parse + validate
        try:
            dp_input = DPStringInputPayload.model_validate(algo_input.input_payload)

        except ValidationError as e:
            raise DomainError("Invalid Edit Distance input.", details = {"errors": e.errors()})

        s1 = dp_input.string1
        s2 = dp_input.string2
        m = len(s1)
        n = len(s2)
        rows = m + 1
        cols = n + 1

        # simulation state
        table = [[None] * cols for _ in range(rows)]
        cell_states = [["default"] * cols for _ in range(rows)]

        steps: list[TimelineStep] = []
        metrics = {
            "cells_computed": 0,
            "table_rows": rows,
            "table_cols": cols,
            "string1_length": m,
            "string2_length": n,
            "matches": 0,
            "substitutions": 0,
            "insertions": 0,
            "deletions": 0,
            "traceback_length": 0,
            "edit_distance": 0,
            "subproblems_reused": 0,
        }


        def add_step(event_type, highlighted, explanation, current_cell = None, dependency_cells = None, traceback_path = None, pseudocode_lines: list[int] | None = None):
            s_payload = {
                "table": [list(row) for row in table],
                "cell_states": [list(row) for row in cell_states],
                "current_cell": list(current_cell) if current_cell else None,
                "dependency_cells": [list(c) for c in dependency_cells] if dependency_cells else [],
                "traceback_path": [list(c) for c in traceback_path] if traceback_path else [],
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



        # INITIALIZE 
        for i in range(rows):
            table[i][0] = i
            cell_states[i][0] = "visited"

        for j in range(cols):
            table[0][j] = j
            cell_states[0][j] = "visited"

        add_step(
            DPEvents.INITIALIZE,
            [HighlightedEntity(id = [0, 0], state = "visited", label = "Base cases")],
            eb.build(
                title = f"Initialize Edit Distance table ({rows} x {cols})",
                body = f'Source = "{s1}" (length {m}), Target = "{s2}" (length {n}). Base row 0..{n}, column 0..{m}.',
                data_snapshot = {"table": [list(row) for row in table], "cell": [0, 0]},
            ),
            pseudocode_lines = [0, 1, 2, 3],
        )


        # FILL TABLE
        t_start = time.perf_counter()

        for i in range(1, rows):
            for j in range(1, cols):
                char_a = s1[i - 1]
                char_b = s2[j - 1]

                # COMPUTE_CELL
                cell_states[i][j] = "active"

                add_step(
                    DPEvents.COMPUTE_CELL,
                    [HighlightedEntity(id = [i, j], state = "active", label = f"({i},{j})")],
                    eb.build(
                        title = f"Compute cell ({i}, {j})",
                        body = f"Comparing source[{i - 1}] = '{char_a}' with target[{j - 1}] = '{char_b}'.",
                        data_snapshot = {"cell": [i, j], "cell_value": None},
                    ),
                    current_cell = [i, j],
                    pseudocode_lines = [4, 5],
                )

                diag_val = table[i - 1][j - 1]
                up_val = table[i - 1][j]
                left_val = table[i][j - 1]
                metrics["subproblems_reused"] += 3

                cell_states[i - 1][j - 1] = "frontier"
                cell_states[i - 1][j] = "frontier"
                cell_states[i][j - 1] = "frontier"

                add_step(
                    DPEvents.READ_DEPENDENCY,
                    [
                        HighlightedEntity(id = [i, j], state = "active", label = f"({i},{j})"),
                        HighlightedEntity(id = [i - 1, j - 1], state = "frontier", label = str(diag_val)),
                        HighlightedEntity(id = [i - 1, j], state = "frontier", label = str(up_val)),
                        HighlightedEntity(id = [i, j - 1], state = "frontier", label = str(left_val)),
                    ],
                    eb.build(
                        title = f"Read dependencies for ({i}, {j})",
                        body = f"Diagonal ({i - 1}, {j - 1}) = {diag_val}, up ({i - 1}, {j}) = {up_val}, left ({i}, {j - 1}) = {left_val}.",
                        data_snapshot = {"cell": [i, j], "diagonal": diag_val, "up": up_val, "left": left_val},
                    ),
                    current_cell = [i, j],
                    dependency_cells = [[i - 1, j - 1], [i - 1, j], [i, j - 1]],
                    pseudocode_lines = [5],
                )

                cell_states[i - 1][j - 1] = "visited"
                cell_states[i - 1][j] = "visited"
                cell_states[i][j - 1] = "visited"


                if char_a == char_b:
                    # MATCH
                    new_val = diag_val
                    metrics["matches"] += 1
                    operation = "match"
                    fill_pseudocode = [6, 7]
                    fill_explanation = eb.build(
                        title = f"Fill cell ({i}, {j}) = {diag_val}",
                        body = f"Match! '{char_a}' == '{char_b}'. Cost = {diag_val} (no extra cost).",
                        data_snapshot = {"cell": [i, j], "cell_value": diag_val, "recurrence": "match", "diagonal": diag_val, "up": up_val, "left": left_val},
                    )

                else:
                    # MISMATCH
                    replace_cost = diag_val + 1
                    delete_cost = up_val + 1
                    insert_cost = left_val + 1
                    new_val = min(replace_cost, delete_cost, insert_cost)
                    fill_pseudocode = [8, 9]

                    if new_val == replace_cost:
                        operation = "replace"
                        metrics["substitutions"] += 1
                        fill_explanation = eb.build(
                            title = f"Fill cell ({i}, {j}) = {new_val}",
                            body = f"No match: '{char_a}' != '{char_b}'. Replace={replace_cost}, delete={delete_cost}, insert={insert_cost}. Chose replace.",
                            data_snapshot = {"cell": [i, j], "cell_value": new_val, "recurrence": "replace", "diagonal": diag_val, "up": up_val, "left": left_val},
                        )

                    elif new_val == delete_cost:
                        operation = "delete"
                        metrics["deletions"] += 1
                        fill_explanation = eb.build(
                            title = f"Fill cell ({i}, {j}) = {new_val}",
                            body = f"No match: '{char_a}' != '{char_b}'. Replace={replace_cost}, delete={delete_cost}, insert={insert_cost}. Chose delete.",
                            data_snapshot = {"cell": [i, j], "cell_value": new_val, "recurrence": "delete", "diagonal": diag_val, "up": up_val, "left": left_val},
                        )

                    else:
                        operation = "insert"
                        metrics["insertions"] += 1
                        fill_explanation = eb.build(
                            title = f"Fill cell ({i}, {j}) = {new_val}",
                            body = f"No match: '{char_a}' != '{char_b}'. Replace={replace_cost}, delete={delete_cost}, insert={insert_cost}. Chose insert.",
                            data_snapshot = {"cell": [i, j], "cell_value": new_val, "recurrence": "insert", "diagonal": diag_val, "up": up_val, "left": left_val},
                        )


                # FILL_CELL
                table[i][j] = new_val
                cell_states[i][j] = "visited"
                metrics["cells_computed"] += 1

                add_step(
                    DPEvents.FILL_CELL,
                    [HighlightedEntity(id = [i, j], state = "visited", label = str(new_val))],
                    fill_explanation,
                    current_cell = [i, j],
                    pseudocode_lines = fill_pseudocode,
                )


            # ROW_COMPLETE
            row_vals = ", ".join(str(table[i][j]) for j in range(cols))

            add_step(
                DPEvents.ROW_COMPLETE,
                [HighlightedEntity(id = [i, 0], state = "visited", label = f"Row {i}")],
                eb.build(
                    title = f"Row {i} complete",
                    body = f"Row {i} complete (source[{i - 1}] = '{s1[i - 1]}'). {metrics['cells_computed']} cells computed.",
                    data_snapshot = {"table": [list(row) for row in table]},
                ),
                pseudocode_lines = [4],
            )


        t_end = time.perf_counter()
        metrics["runtime_ms"] = round((t_end - t_start) * 1000, 3)
        metrics["edit_distance"] = table[m][n]


        # TRACEBACK — reconstruct the edit operations
        operations = []
        tb_path = []
        i, j = m, n

        cell_states[i][j] = "source"

        add_step(
            DPEvents.TRACEBACK_START,
            [HighlightedEntity(id = [i, j], state = "source", label = str(table[i][j]))],
            eb.build(
                title = f"Begin traceback from ({i}, {j})",
                body = f"Edit distance = {table[m][n]}. Tracing back to reconstruct operations.",
                data_snapshot = {"cell": [i, j], "cell_value": table[m][n]},
            ),
            current_cell = [i, j],
            pseudocode_lines = [10],
        )

        while i > 0 or j > 0:
            tb_path.append([i, j])
            metrics["traceback_length"] += 1

            if i > 0 and j > 0 and s1[i - 1] == s2[j - 1]:
                # match — move diagonal, no operation
                cell_states[i][j] = "success"
                operations.append(f"keep '{s1[i - 1]}'")

                add_step(
                    DPEvents.TRACEBACK_STEP,
                    [HighlightedEntity(id = [i, j], state = "success", label = s1[i - 1])],
                    eb.build(
                        title = f"Traceback: keep '{s1[i - 1]}' at ({i}, {j})",
                        body = f"source[{i - 1}] = '{s1[i - 1]}' == target[{j - 1}] = '{s2[j - 1]}'. Move diagonal.",
                        data_snapshot = {"cell": [i, j], "operation": "keep", "direction": "diagonal"},
                    ),
                    current_cell = [i, j],
                    traceback_path = list(tb_path),
                    pseudocode_lines = [10],
                )

                i -= 1
                j -= 1

            elif i > 0 and j > 0 and table[i][j] == table[i - 1][j - 1] + 1:
                # replace — move diagonal
                cell_states[i][j] = "swap"
                operations.append(f"replace '{s1[i - 1]}' → '{s2[j - 1]}'")

                add_step(
                    DPEvents.TRACEBACK_STEP,
                    [HighlightedEntity(id = [i, j], state = "swap", label = f"{s1[i - 1]}→{s2[j - 1]}")],
                    eb.build(
                        title = f"Traceback: replace '{s1[i - 1]}' -> '{s2[j - 1]}' at ({i}, {j})",
                        body = f"Replace source[{i - 1}] = '{s1[i - 1]}' with '{s2[j - 1]}'. Move diagonal.",
                        data_snapshot = {"cell": [i, j], "operation": "replace", "direction": "diagonal"},
                    ),
                    current_cell = [i, j],
                    traceback_path = list(tb_path),
                    pseudocode_lines = [10],
                )

                i -= 1
                j -= 1

            elif i > 0 and table[i][j] == table[i - 1][j] + 1:
                # delete — move up
                cell_states[i][j] = "target"
                operations.append(f"delete '{s1[i - 1]}'")

                add_step(
                    DPEvents.TRACEBACK_STEP,
                    [HighlightedEntity(id = [i, j], state = "target", label = f"del '{s1[i - 1]}'")],
                    eb.build(
                        title = f"Traceback: delete '{s1[i - 1]}' at ({i}, {j})",
                        body = f"Delete source[{i - 1}] = '{s1[i - 1]}'. Move up to ({i - 1}, {j}).",
                        data_snapshot = {"cell": [i, j], "operation": "delete", "direction": "up"},
                    ),
                    current_cell = [i, j],
                    traceback_path = list(tb_path),
                    pseudocode_lines = [10],
                )

                i -= 1

            else:
                # insert — move left
                cell_states[i][j] = "source"
                operations.append(f"insert '{s2[j - 1]}'")

                add_step(
                    DPEvents.TRACEBACK_STEP,
                    [HighlightedEntity(id = [i, j], state = "source", label = f"ins '{s2[j - 1]}'")],
                    eb.build(
                        title = f"Traceback: insert '{s2[j - 1]}' at ({i}, {j})",
                        body = f"Insert '{s2[j - 1]}'. Move left to ({i}, {j - 1}).",
                        data_snapshot = {"cell": [i, j], "operation": "insert", "direction": "left"},
                    ),
                    current_cell = [i, j],
                    traceback_path = list(tb_path),
                    pseudocode_lines = [10],
                )

                j -= 1


        operations.reverse()
        ops_summary = ", ".join(operations)


        # COMPLETE
        add_step(
            DPEvents.COMPLETE,
            [HighlightedEntity(id = [m, n], state = "success", label = str(table[m][n]))],
            eb.build(
                title = "Edit Distance complete",
                body = f'Transforming "{s1}" -> "{s2}" requires {table[m][n]} operation(s). {metrics["cells_computed"]} cells computed.',
                data_snapshot = {"table": [list(row) for row in table], "cell_value": table[m][n]},
            ),
            traceback_path = list(tb_path),
            pseudocode_lines = [10],
        )


        # return
        total_cells = m * n
        naive_calls = 3 ** max(m, n) if max(m, n) <= 25 else None
        avoidance = (
            f"Tabulation computed {total_cells} cells, each solved exactly once. "
            f"Naive recursion branches into 3 choices (insert, delete, replace) at each step"
            f" (~3^max(m,n)" + (f" = {naive_calls:,}" if naive_calls else "") + " calls). "
            f"Each dependency lookup ({metrics['subproblems_reused']} total) "
            f"reuses a previously computed result instead of recomputing it."
        )

        final_result = {
            "edit_distance": table[m][n],
            "operations": list(operations),
            "table_dimensions": [rows, cols],
            "subproblem_avoidance": avoidance,
        }

        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity": "O(m × n)",
            "space_complexity": "O(m × n)",
            "string1_length": m,
            "string2_length": n,
        }

        return AlgorithmOutput(
            timeline_steps = steps,
            final_result = final_result,
            summary_metrics = metrics,
            algorithm_metadata = alg_metadata,
        )
