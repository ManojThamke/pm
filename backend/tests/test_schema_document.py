import json
from pathlib import Path

import pytest

SCHEMA_PATH = Path(__file__).parents[2] / "docs" / "database-schema.json"


def load_schema() -> dict:
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def test_schema_is_machine_readable_and_complete() -> None:
    schema = load_schema()

    assert schema["schema_version"] == 1
    assert schema["database"]["engine"] == "sqlite"
    assert set(schema["tables"]) == {"users", "boards", "columns", "cards"}
    assert schema["tables"]["boards"]["constraints"] == ["UNIQUE(user_id)"]
    assert schema["initialization"]["seed_fixed_columns"] == 5


def test_schema_relationships_and_api_mapping_are_explicit() -> None:
    schema = load_schema()

    assert "boards 1-to-many columns" in schema["relationships"]
    assert schema["api_mapping"]["board_response"]["columns"][0]["cardIds"] == [
        "string"
    ]
    assert (
        "A board update is applied in one transaction."
        in schema["api_mapping"]["persistence_rules"]
    )


def test_invalid_json_is_rejected() -> None:
    with pytest.raises(json.JSONDecodeError):
        json.loads('{"schema_version":')
