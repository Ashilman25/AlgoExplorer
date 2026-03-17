from app.simulation.types import AlgorithmInput
from app.simulation import registry
from app.schemas.runs import CreateRunRequest, CreateRunResponse
from app.data.models import SimulationRun
from app.validators import validate_module_algorithm, validate_graph_payload, validate_array_payload, validate_dp_payload

from app.exceptions import DomainError


def run_simulation(request: CreateRunRequest, db) -> CreateRunResponse:
    
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

    output = algorithm.run(algo_input)

    timeline_list = []
    
    for step in output.timeline_steps:
        step_dict = step.model_dump()
        timeline_list.append(step_dict)
        
    config_data = {
        "input_payload" : request.input_payload,
        "algorithm_config" : request.algorithm_config or {},
        "execution_mode" : request.execution_mode,
        "explanation_level" : request.explanation_level
    }
    
    run = SimulationRun(
        scenario_id = request.scenario_id,
        module_type = request.module_type,
        algorithm_key = request.algorithm_key,
        config = config_data,
        summary = output.summary_metrics,
        timeline = timeline_list
    )

    db.add(run)
    db.commit()
    db.refresh(run)
    
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
        validate_graph_payload(input_payload)
        
    elif module_type == "sorting":
        validate_array_payload(input_payload)
        
    elif module_type == "dp":
        validate_dp_payload(algorithm_key, input_payload)
        
    else:
        raise DomainError(f"No payload validator for unknown module '{module_type}'")


from app.algorithms import graph
from app.algorithms import sorting
from app.algorithms import dp