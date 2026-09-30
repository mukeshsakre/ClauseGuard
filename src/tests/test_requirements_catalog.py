"""Release traceability must cover normative PRD IDs exactly once."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
from scripts.requirements_catalog import load_requirements, validate_matrix  # noqa: E402


def test_matrix_covers_every_prd_requirement_once() -> None:
    requirements = load_requirements()
    assert len(requirements) > 80  # Guard against accidentally reading only one table.
    assert validate_matrix(ROOT / "docs/requirements-traceability.md", requirements) == []


def test_matrix_validation_rejects_missing_and_duplicate_requirements(tmp_path) -> None:
    source = (ROOT / "docs/requirements-traceability.md").read_text(encoding="utf-8")
    first = next(line for line in source.splitlines() if line.startswith("| FR-"))
    matrix = tmp_path / "matrix.md"
    matrix.write_text(source + "\n" + first + "\n", encoding="utf-8")
    assert any("found 2" in error for error in validate_matrix(matrix, load_requirements()))
    matrix.write_text(source.replace(first, ""), encoding="utf-8")
    assert any("found 0" in error for error in validate_matrix(matrix, load_requirements()))
