from __future__ import annotations

from collections.abc import Sequence
from pathlib import Path
import sys

from ..models.invocation import HarnessRequest
from ..models.plan import ParsedPlan
from .invocation import parse_cli_invocation
from .plan import load_active_plan


def load_requested_plan(
    argv: Sequence[str] | None = None,
) -> tuple[HarnessRequest, Path, ParsedPlan]:
    arguments = list(sys.argv[1:] if argv is None else argv)

    request = parse_cli_invocation(arguments)
    plan_path, plan = load_active_plan(request.plan_id)
    return request, plan_path, plan
