from __future__ import annotations

from pathlib import Path
from typing import NamedTuple

from ..paths import PROJECT_ROOT

"""Worker 실행에 필요한 프로젝트 내부 경로를 구성한다."""

class WorkerPaths(NamedTuple):
    backend: Path
    java_env: Path
    gradle_user_home: Path
    worker_temp: Path
    worker_home: Path
    npm_cache: Path
    npm_user_config: Path


def build_common_worker_paths(
    project_root: Path = PROJECT_ROOT,
) -> WorkerPaths:
    """프로젝트 루트를 기준으로 Worker 전용 경로를 구성한다."""

    backend = project_root / "backend"
    gradle_user_home = backend / ".gradle-user-home"
    worker_temp = gradle_user_home / "tmp"
    worker_home = gradle_user_home / "worker-home"

    return WorkerPaths(
        backend=backend,
        java_env=backend / ".env.local",
        gradle_user_home=gradle_user_home,
        worker_temp=worker_temp,
        worker_home=worker_home,
        npm_cache=worker_temp / "npm-cache",
        npm_user_config=worker_home / ".npmrc",
    )
