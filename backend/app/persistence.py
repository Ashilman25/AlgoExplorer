import base64
import gzip
import json
import math
from datetime import date, datetime
from typing import Any

from app.exceptions import DomainError


TIMELINE_STORAGE_SCHEMA_VERSION = 1
TIMELINE_COMPRESSION_THRESHOLD_BYTES = 64 * 1024


def _normalize_json_value(value: Any, path: str = "root") -> Any:
    if value is None or isinstance(value, (bool, int, str)):
        return value

    if isinstance(value, float):
        if not math.isfinite(value):
            raise DomainError(f"Invalid non-finite number at {path}.", details = {"path": path, "value_type": "float"})
        
        return value

    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if isinstance(value, dict):
        normalized = {}
        for key, item in value.items():
            if not isinstance(key, str):
                raise DomainError(f"Invalid non-string key at {path}.", details = {"path": path, "key_type": type(key).__name__})
            
            normalized[key] = _normalize_json_value(item, f"{path}.{key}")
        return normalized

    if isinstance(value, (list, tuple)):
        return [_normalize_json_value(item, f"{path}[{index}]") for index, item in enumerate(value)]

    if isinstance(value, set):
        return [
            _normalize_json_value(item, f"{path}[{index}]")
            for index, item in enumerate(sorted(value, key = repr))
        ]

    model_dump = getattr(value, "model_dump", None)
    if callable(model_dump):
        return _normalize_json_value(model_dump(), path)

    raise DomainError(
        f"Unsupported value type at {path}.",
        details = {"path": path, "value_type": type(value).__name__},
    )


def safe_json_value(value: Any, label: str = "payload") -> Any:
    normalized = _normalize_json_value(value, label)
    try:
        serialized = json.dumps(normalized, allow_nan = False, separators = (",", ":"))
        
    except (TypeError, ValueError) as exc:
        raise DomainError(f"Unable to serialize {label}.", details = {"label": label}) from exc

    return json.loads(serialized)


def encode_timeline_payload(steps: list[dict[str, Any]]) -> dict[str, Any]:
    safe_steps = safe_json_value(steps, label = "timeline")
    serialized = json.dumps(safe_steps, allow_nan = False, separators = (",", ":"))
    raw_bytes = serialized.encode("utf-8")

    envelope: dict[str, Any] = {
        "schema_version": TIMELINE_STORAGE_SCHEMA_VERSION,
        "kind": "timeline",
        "step_count": len(safe_steps),
        "bytes_uncompressed": len(raw_bytes),
    }

    if len(raw_bytes) >= TIMELINE_COMPRESSION_THRESHOLD_BYTES:
        compressed = gzip.compress(raw_bytes)
        envelope["encoding"] = "gzip+base64+json"
        envelope["data"] = base64.b64encode(compressed).decode("ascii")
        envelope["bytes_compressed"] = len(compressed)
        
    else:
        envelope["encoding"] = "inline-json"
        envelope["data"] = safe_steps

    return envelope


def decode_timeline_payload(payload: Any) -> list[dict[str, Any]]:
    if payload is None:
        return []

    if isinstance(payload, list):
        return safe_json_value(payload, label = "timeline")

    if isinstance(payload, dict) and "schema_version" not in payload:
        legacy_steps = payload.get("steps")
        if isinstance(legacy_steps, list):
            return safe_json_value(legacy_steps, label = "timeline")
        
        raise DomainError("Invalid legacy timeline payload.", details = {"kind": "timeline"})

    if not isinstance(payload, dict):
        raise DomainError("Invalid timeline payload.", details = {"kind": "timeline"})

    if payload.get("kind") != "timeline":
        raise DomainError("Invalid timeline payload kind.", details = {"kind": payload.get("kind")})

    encoding = payload.get("encoding")
    data = payload.get("data")

    if encoding == "inline-json":
        if not isinstance(data, list):
            raise DomainError("Invalid inline timeline payload.", details = {"encoding": encoding})
        return safe_json_value(data, label = "timeline")

    if encoding == "gzip+base64+json":
        if not isinstance(data, str):
            raise DomainError("Invalid compressed timeline payload.", details = {"encoding": encoding})

        try:
            compressed = base64.b64decode(data.encode("ascii"))
            raw_json = gzip.decompress(compressed).decode("utf-8")
            decoded = json.loads(raw_json)
            
        except (ValueError, OSError, json.JSONDecodeError) as exc:
            raise DomainError(
                "Unable to decode timeline payload.",
                details = {"encoding": encoding},
            ) from exc

        if not isinstance(decoded, list):
            raise DomainError("Decoded timeline payload is invalid.", details = {"encoding": encoding})

        return safe_json_value(decoded, label = "timeline")

    raise DomainError("Unknown timeline payload encoding.", details = {"encoding": encoding})
