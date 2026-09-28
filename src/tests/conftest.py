"""Make the source-tree core package importable without an editable install."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


CORE_ROOT = Path(__file__).resolve().parents[1] / "packages" / "core"
PACKAGE_INIT = CORE_ROOT / "__init__.py"

# The repository keeps core modules directly under packages/core, while the
# installed distribution exposes those modules as clauseguard_core.*.
spec = importlib.util.spec_from_file_location(
    "clauseguard_core",
    PACKAGE_INIT,
    submodule_search_locations=[str(CORE_ROOT)],
)
if spec is None or spec.loader is None:
    raise ImportError(f"Could not load ClauseGuard core package from {CORE_ROOT}")

core_package = importlib.util.module_from_spec(spec)
sys.modules.setdefault("clauseguard_core", core_package)
spec.loader.exec_module(core_package)
