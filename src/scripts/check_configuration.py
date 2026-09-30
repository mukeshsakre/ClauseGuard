"""Check startup configuration without connecting to services or revealing secrets."""

import argparse
import json

from pydantic import ValidationError

from clauseguard_core.config import Settings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--environment", choices=["development", "test", "production"])
    arguments = parser.parse_args()
    overrides = {"app_env": arguments.environment} if arguments.environment else {}
    try:
        settings = Settings(**overrides)
    except ValidationError as exc:
        # Explicitly omit inputs and contexts: both can contain credential values.
        for error in exc.errors(include_input=False, include_context=False, include_url=False):
            print(json.dumps({"field": ".".join(map(str, error["loc"])) or "configuration",
                              "message": error["msg"]}))
        return 1
    print(json.dumps(settings.redacted_summary(), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
