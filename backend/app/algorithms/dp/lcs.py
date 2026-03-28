import time

from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import DPStringInputPayload, DPEvents
from app.exceptions import DomainError


@register("dp", "lcs")
class LCSAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "dp"

    @property
    def algorithm_key(self) -> str:
        return "lcs"


    def run(self, algo_input: AlgorithmInput) -> AlgorithmOutput:
        explain = algo_input.explanation_level

        # parse + validate
        try:
            dp_input = DPStringInputPayload.model_validate(algo_input.input_payload)

        except ValidationError as e:
            raise DomainError("Invalid LCS input.", details = {"errors": e.errors()})

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
            "traceback_length": 0,
            "lcs_length": 0,
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
                explanation = explanation if explain != "none" else None,
                timestamp_or_order = len(steps),
            )

            steps.append(step)



        # INITIALIZE — fill base cases (row 0 and column 0 with 0s)
        for i in range(rows):
            table[i][0] = 0
            cell_states[i][0] = "visited"

        for j in range(cols):
            table[0][j] = 0
            cell_states[0][j] = "visited"

        add_step(
            DPEvents.INITIALIZE,
            [HighlightedEntity(id = [0, 0], state = "visited", label = "Base cases")],
            f"Initialize LCS table ({rows} × {cols}). "
            f'String A = "{s1}" (length {m}), String B = "{s2}" (length {n}). '
            f"Base row and column filled with 0 — an empty string has LCS length 0 with anything.",
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
                    f"Computing cell ({i}, {j}): comparing A[{i - 1}] = '{char_a}' with B[{j - 1}] = '{char_b}'.",
                    current_cell = [i, j],
                    pseudocode_lines = [4, 5],
                )


                if char_a == char_b:
                    diag_val = table[i - 1][j - 1]
                    new_val = diag_val + 1
                    metrics["subproblems_reused"] += 1

                    cell_states[i - 1][j - 1] = "frontier"

                    add_step(
                        DPEvents.READ_DEPENDENCY,
                        [
                            HighlightedEntity(id = [i, j], state = "active", label = f"({i},{j})"),
                            HighlightedEntity(id = [i - 1, j - 1], state = "frontier", label = str(diag_val)),
                        ],
                        f"Characters match: '{char_a}' == '{char_b}'. "
                        f"Read diagonal cell ({i - 1}, {j - 1}) = {diag_val}.",
                        current_cell = [i, j],
                        dependency_cells = [[i - 1, j - 1]],
                        pseudocode_lines = [6, 7],
                    )

                    cell_states[i - 1][j - 1] = "visited"

                    # FILL_CELL 
                    table[i][j] = new_val
                    cell_states[i][j] = "visited"
                    metrics["cells_computed"] += 1

                    add_step(
                        DPEvents.FILL_CELL,
                        [HighlightedEntity(id = [i, j], state = "visited", label = str(new_val))],
                        f"Match! table[{i}][{j}] = table[{i - 1}][{j - 1}] + 1 = {diag_val} + 1 = {new_val}.",
                        current_cell = [i, j],
                        pseudocode_lines = [7],
                    )

                else:
                    up_val = table[i - 1][j]
                    left_val = table[i][j - 1]
                    new_val = max(up_val, left_val)
                    metrics["subproblems_reused"] += 2

                    cell_states[i - 1][j] = "frontier"
                    cell_states[i][j - 1] = "frontier"

                    add_step(
                        DPEvents.READ_DEPENDENCY,
                        [
                            HighlightedEntity(id = [i, j], state = "active", label = f"({i},{j})"),
                            HighlightedEntity(id = [i - 1, j], state = "frontier", label = str(up_val)),
                            HighlightedEntity(id = [i, j - 1], state = "frontier", label = str(left_val)),
                        ],
                        f"No match: '{char_a}' ≠ '{char_b}'. "
                        f"Read up ({i - 1}, {j}) = {up_val} and left ({i}, {j - 1}) = {left_val}.",
                        current_cell = [i, j],
                        dependency_cells = [[i - 1, j], [i, j - 1]],
                        pseudocode_lines = [8, 9],
                    )

                    cell_states[i - 1][j] = "visited"
                    cell_states[i][j - 1] = "visited"


                    table[i][j] = new_val
                    cell_states[i][j] = "visited"
                    metrics["cells_computed"] += 1

                    if up_val >= left_val:
                        branch = f"up ({up_val})"
                        
                    else:
                        branch = f"left ({left_val})"

                    add_step(
                        DPEvents.FILL_CELL,
                        [HighlightedEntity(id = [i, j], state = "visited", label = str(new_val))],
                        f"No match. table[{i}][{j}] = max(up={up_val}, left={left_val}) = {new_val} (chose {branch}).",
                        current_cell = [i, j],
                        pseudocode_lines = [9],
                    )


            # ROW_COMPLETE 
            row_vals = ", ".join(str(table[i][j]) for j in range(cols))

            add_step(
                DPEvents.ROW_COMPLETE,
                [HighlightedEntity(id = [i, 0], state = "visited", label = f"Row {i}")],
                f"Row {i} complete (A[{i - 1}] = '{s1[i - 1]}'): [{row_vals}].",
                pseudocode_lines = [4],
            )


        t_end = time.perf_counter()
        metrics["runtime_ms"] = round((t_end - t_start) * 1000, 3)


        # TRACEBACK 
        lcs_chars = []
        tb_path = []
        i, j = m, n

        cell_states[i][j] = "source"

        add_step(
            DPEvents.TRACEBACK_START,
            [HighlightedEntity(id = [i, j], state = "source", label = str(table[i][j]))],
            f"Begin traceback from cell ({i}, {j}) with LCS length = {table[m][n]}.",
            current_cell = [i, j],
            pseudocode_lines = [10],
        )

        while i > 0 and j > 0:
            if s1[i - 1] == s2[j - 1]:

                lcs_chars.append(s1[i - 1])
                tb_path.append([i, j])
                cell_states[i][j] = "success"
                metrics["traceback_length"] += 1

                add_step(
                    DPEvents.TRACEBACK_STEP,
                    [HighlightedEntity(id = [i, j], state = "success", label = s1[i - 1])],
                    f"A[{i - 1}] = '{s1[i - 1]}' == B[{j - 1}] = '{s2[j - 1]}' — "
                    f"character '{s1[i - 1]}' is in the LCS. Move diagonal to ({i - 1}, {j - 1}).",
                    current_cell = [i, j],
                    traceback_path = list(tb_path),
                    pseudocode_lines = [10],
                )

                i -= 1
                j -= 1

            elif table[i - 1][j] >= table[i][j - 1]:
                # move up
                cell_states[i][j] = "source"
                metrics["traceback_length"] += 1

                add_step(
                    DPEvents.TRACEBACK_STEP,
                    [HighlightedEntity(id = [i, j], state = "source", label = str(table[i][j]))],
                    f"table[{i - 1}][{j}] = {table[i - 1][j]} ≥ table[{i}][{j - 1}] = {table[i][j - 1]}. "
                    f"Move up to ({i - 1}, {j}).",
                    current_cell = [i, j],
                    traceback_path = list(tb_path),
                    pseudocode_lines = [10],
                )

                i -= 1

            else:
                # move left
                cell_states[i][j] = "source"
                metrics["traceback_length"] += 1

                add_step(
                    DPEvents.TRACEBACK_STEP,
                    [HighlightedEntity(id = [i, j], state = "source", label = str(table[i][j]))],
                    f"table[{i - 1}][{j}] = {table[i - 1][j]} < table[{i}][{j - 1}] = {table[i][j - 1]}. "
                    f"Move left to ({i}, {j - 1}).",
                    current_cell = [i, j],
                    traceback_path = list(tb_path),
                    pseudocode_lines = [10],
                )

                j -= 1


        lcs_chars.reverse()
        lcs_string = "".join(lcs_chars)
        metrics["lcs_length"] = len(lcs_string)


        # COMPLETE 
        add_step(
            DPEvents.COMPLETE,
            [HighlightedEntity(id = [m, n], state = "success", label = str(table[m][n]))],
            f'LCS complete! The longest common subsequence of "{s1}" and "{s2}" is '
            f'"{lcs_string}" (length {len(lcs_string)}). '
            f"{metrics['cells_computed']} cells computed in a {rows} × {cols} table.",
            traceback_path = list(tb_path),
            pseudocode_lines = [10],
        )


        # return
        total_cells = m * n
        naive_calls = 2 ** (m + n) if (m + n) <= 40 else None
        avoidance = (
            f"Tabulation computed {total_cells} cells, each solved exactly once. "
            f"Naive recursion would revisit overlapping subproblems exponentially"
            f" (~2^(m+n)" + (f" = {naive_calls:,}" if naive_calls else "") + " calls). "
            f"Each dependency lookup ({metrics['subproblems_reused']} total) "
            f"reuses a previously computed result instead of recomputing it."
        )

        final_result = {
            "lcs": lcs_string,
            "lcs_length": len(lcs_string),
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
