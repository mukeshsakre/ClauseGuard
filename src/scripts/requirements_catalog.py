"""Read the PRD's requirement tables and check their release traceability entries.

Only full FR/NFR identifiers in the normative tables are requirements. Appendix
ranges are summaries, and must not create invented or duplicate requirements.
"""

from __future__ import annotations

import argparse
from collections import Counter
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
import re


IDENTIFIER = re.compile(r"(?:FR|NFR)-[A-Z]+-\d{2}\Z")
STATUSES = {"NOT_IMPLEMENTED", "PARTIAL", "IMPLEMENTED_UNVERIFIED", "VERIFIED", "BLOCKED"}
ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Requirement:
    identifier: str
    title: str
    priority: str
    condition: str


class RequirementTables(HTMLParser):
    """Extract table cells without relying on presentation-specific HTML classes."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.rows: list[list[str]] = []
        self._row: list[str] | None = None
        self._cell: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "tr":
            self._row = []
        elif tag in {"td", "th"} and self._row is not None:
            self._cell = []
        elif tag in {"br", "p", "li"} and self._cell is not None:
            self._cell.append(" ")

    def handle_data(self, data: str) -> None:
        if self._cell is not None:
            self._cell.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag in {"td", "th"} and self._cell is not None and self._row is not None:
            self._row.append(" ".join("".join(self._cell).split()))
            self._cell = None
        elif tag == "tr" and self._row is not None:
            self.rows.append(self._row)
            self._row = None


def load_requirements(path: Path = ROOT / "specs" / "prd_v2.html") -> list[Requirement]:
    parser = RequirementTables()
    parser.feed(path.read_text(encoding="utf-8"))
    requirements: dict[str, Requirement] = {}
    for row in parser.rows:
        if len(row) == 4 and IDENTIFIER.fullmatch(row[0]):
            # The normative definition precedes the appendix's duplicate index.
            requirements.setdefault(row[0], Requirement(*row))
    if not requirements:
        raise ValueError("No normative FR/NFR rows found in the PRD")
    return list(requirements.values())


def validate_matrix(path: Path, requirements: list[Requirement]) -> list[str]:
    rows = [line.split("|")[1:-1] for line in path.read_text(encoding="utf-8").splitlines()
            if line.startswith("| FR-") or line.startswith("| NFR-")]
    counts = Counter(row[0].strip() for row in rows)
    expected = {item.identifier: item for item in requirements}
    errors = [f"{identifier}: expected exactly one entry, found {counts[identifier]}"
              for identifier in expected if counts[identifier] != 1]
    errors.extend(f"Unknown requirement: {identifier}" for identifier in counts.keys() - expected.keys())
    for row in rows:
        fields = [value.strip() for value in row]
        if len(fields) != 12:
            errors.append(f"{fields[0]}: expected 12 traceability fields, found {len(fields)}")
            continue
        requirement = expected.get(fields[0])
        if requirement and fields[2] != requirement.priority:
            errors.append(f"{fields[0]}: priority differs from PRD")
        if fields[4] not in STATUSES:
            errors.append(f"{fields[0]}: invalid implementation status")
        if any(not value for value in fields):
            errors.append(f"{fields[0]}: empty traceability field")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", type=Path, default=ROOT / "src/docs/requirements-traceability.md")
    arguments = parser.parse_args()
    requirements = load_requirements()
    errors = validate_matrix(arguments.check, requirements)
    for error in errors:
        print(error)
    if not errors:
        print(f"PASS: {len(requirements)} PRD requirements, exactly one complete entry each")
    return int(bool(errors))


if __name__ == "__main__":
    raise SystemExit(main())
