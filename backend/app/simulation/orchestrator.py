import time

from app.simulation.types import AlgorithmInput
from app.simulation import registry
from app.schemas.runs import CreateRunRequest, CreateRunResponse
from app.data.models import SimulationRun
from app.persistence import encode_timeline_payload, safe_json_value
from app.validators import validate_module_algorithm, validate_graph_payload, validate_array_payload, validate_dp_payload
from app.observability import get_logger, compact_context, summarize_input_payload, summarize_algorithm_config, summarize_summary_metrics

from app.exceptions import DomainError

logger = get_logger("simulation.orchestrator")


def run_simulation(request: CreateRunRequest, db, user_id: int | None = None, guest_session_id: str | None = None) -> CreateRunResponse:
    
    validate_module_algorithm(request.module_type, request.algorithm_key)
    _validate_payload(request.module_type, request.algorithm_key, request.input_payload)

    if not registry.is_registered(request.module_type, request.algorithm_key):
        raise DomainError(
            f"'{request.algorithm_key}' in module '{request.module_type}' "
            f"has no implementation registered yet.",
            details = {"module": request.module_type, "algorithm": request.algorithm_key},
        )

    algorithm = registry.get_algorithm(request.module_type, request.algorithm_key)

    algo_input = AlgorithmInput(
        input_payload = request.input_payload,
        algorithm_config = request.algorithm_config or {},
        execution_mode = request.execution_mode,
        explanation_level = request.explanation_level,
    )

    logger.info(
        "algorithm.execution.started %s",
        compact_context(
            module_type = request.module_type,
            algorithm_key = request.algorithm_key,
            execution_mode = request.execution_mode,
            explanation_level = request.explanation_level,
            input = summarize_input_payload(request.module_type, request.algorithm_key, request.input_payload),
            **summarize_algorithm_config(request.algorithm_config),
        ),
    )

    execution_started_at = time.perf_counter()
    output = algorithm.run(algo_input)
    execution_elapsed_ms = round((time.perf_counter() - execution_started_at) * 1000, 2)

    logger.info(
        "algorithm.execution.completed %s",
        compact_context(
            module_type = request.module_type,
            algorithm_key = request.algorithm_key,
            execution_mode = request.execution_mode,
            timeline_steps = len(output.timeline_steps),
            wall_clock_ms = execution_elapsed_ms,
            summary = summarize_summary_metrics(output.summary_metrics),
        ),
    )

    timeline_list = []

    for step in output.timeline_steps:
        step_dict = step.model_dump()
        timeline_list.append(step_dict)

    timeline_payload = encode_timeline_payload(timeline_list)
    config_data = safe_json_value(
        {
            "input_payload" : request.input_payload,
            "algorithm_config" : request.algorithm_config or {},
            "execution_mode" : request.execution_mode,
            "explanation_level" : request.explanation_level
        },
        label = "run config",
    )
    summary_data = safe_json_value(output.summary_metrics, label = "run summary")
    
    run = SimulationRun(
        user_id = user_id,
        guest_session_id = guest_session_id,
        scenario_id = request.scenario_id,
        module_type = request.module_type,
        algorithm_key = request.algorithm_key,
        config = config_data,
        summary = summary_data,
        timeline = timeline_payload
    )

    db.add(run)
    db.commit()
    db.refresh(run)

    logger.info(
        "run.create.persisted %s",
        compact_context(
            run_id = run.id,
            module_type = run.module_type,
            algorithm_key = run.algorithm_key,
            scenario_id = run.scenario_id,
            timeline_steps = len(timeline_list),
            timeline_encoding = timeline_payload.get("encoding"),
            summary = summarize_summary_metrics(output.summary_metrics),
        ),
    )
    
    summary_response = CreateRunResponse(
        id = run.id,
        module_type = run.module_type,
        algorithm_key = run.algorithm_key,
        summary = output.summary_metrics,
        timeline_available = len(output.timeline_steps) > 0,
        created_at = run.created_at
    )

    return summary_response


def _validate_payload(module_type: str, algorithm_key: str, input_payload: dict) -> None:
    if module_type == "graph":
        validate_graph_payload(input_payload, algorithm_key = algorithm_key)
        
    elif module_type == "sorting":
        validate_array_payload(input_payload, algorithm_key = algorithm_key)
        
    elif module_type == "dp":
        validate_dp_payload(algorithm_key, input_payload)
        
    else:
        raise DomainError(f"No payload validator for unknown module '{module_type}'")


from app.algorithms import graph
from app.algorithms import sorting
from app.algorithms import dp