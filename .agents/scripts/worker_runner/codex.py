from __future__ import annotations

from pathlib import Path
import os
import shutil
import sys

from .config import read_config_overrides


# Codex 실행 기본 제한 시간 (30분)
DEFAULT_TIMEOUT_SECONDS = 30 * 60

# 프로젝트 루트
PROJECT_ROOT = Path(__file__).resolve().parents[3]

# 허용되는 Worker 목록
WORKERS = ("fe-worker", "be-worker")


# PATH에서 Codex 실행 파일 찾기
def resolve_codex_executable() -> str:
    for candidate in ("codex", "codex.cmd"):
        resolved = shutil.which(candidate)

        if resolved is not None:
            return resolved

    raise RuntimeError(
        "PATH에서 Codex CLI를 찾을 수 없습니다."
    )
# 기본 CODEX_HOME 경로 반환
def resolve_codex_home() -> Path:
    return Path.home() / ".codex"


# codex exec 명령어 생성
def build_codex_command(
    allowed_paths: tuple[str, ...],
    forbidden_paths: tuple[str, ...],
    output_path: Path,
    executable: str | None = None,
    readable_paths: tuple[str, ...] = (),
) -> list[str]:
    command = [executable or resolve_codex_executable(), "exec", "-o", str(output_path)]
    
    for override in read_config_overrides(
        allowed_paths,
        forbidden_paths,
        readable_paths=readable_paths,
    ):
        command.extend(["-c", override])
    
    command.append("-")
    return command


def _npm_package_root(path: Path) -> Path | None:
    parts = tuple(part.lower() for part in path.parts)

    for index in range(len(parts) - 1):
        if parts[index : index + 2] == ("node_modules", "npm"):
            return Path(*path.parts[: index + 2])

    return None


def _homebrew_package_root(path: Path) -> Path | None:
    parts = tuple(part.lower() for part in path.parts)

    for index, part in enumerate(parts):
        if part == "cellar" and len(parts) > index + 2:
            return Path(*path.parts[: index + 3])

    return None


def _homebrew_opt_package_root(path: Path) -> Path | None:
    parts = tuple(part.lower() for part in path.parts)

    for index, part in enumerate(parts):
        if part == "opt" and len(parts) > index + 1:
            return Path(*path.parts[: index + 2])

    return None


def collect_worker_readable_paths(
    environment: dict[str, str],
    *,
    home_dir: Path | None = None,
    platform_name: str | None = None,
    python_executable: str | Path = sys.executable,
    project_root: Path = PROJECT_ROOT,
) -> tuple[str, ...]:
    """Worker가 사용하는 외부 Toolchain 경로를 OS에 맞게 수집한다."""

    paths: list[Path] = []
    actual_home = home_dir or Path.home()
    actual_platform = platform_name or sys.platform

    def add(candidate: str | Path | None, *, require_directory: bool = False) -> None:
        if not candidate:
            return

        path = Path(candidate).expanduser()
        if require_directory and not path.is_dir():
            return

        if path not in paths:
            paths.append(path)

    add(environment.get("JAVA_HOME"))

    python_path = Path(python_executable)
    resolved_python_path = python_path.resolve()
    add(python_path)
    add(python_path.parent)
    add(resolved_python_path)
    add(resolved_python_path.parent)
    add(_homebrew_opt_package_root(python_path))
    add(_homebrew_package_root(resolved_python_path))

    search_path = environment.get("PATH")
    for tool_name in ("node", "npm", "git"):
        executable = shutil.which(tool_name, path=search_path)
        if executable is None:
            continue

        executable_path = Path(executable)
        resolved_path = executable_path.resolve()
        add(executable_path.parent)
        add(resolved_path.parent)
        add(executable_path)
        add(resolved_path)
        add(_homebrew_opt_package_root(executable_path))
        add(_homebrew_package_root(resolved_path))

        if tool_name == "npm":
            for npm_path in (executable_path, resolved_path):
                add(_npm_package_root(npm_path))
                add(
                    npm_path.parent / "node_modules" / "npm",
                    require_directory=True,
                )

        if tool_name == "git" and actual_platform == "win32":
            for git_path in (executable_path, resolved_path):
                if git_path.parent.name.lower() in {"bin", "cmd"}:
                    add(git_path.parent.parent, require_directory=True)

    if actual_platform == "darwin":
        add("/Library/Developer/CommandLineTools")
        add("/System/Library/OpenSSL")

    add(actual_home / ".gitconfig", require_directory=False)
    add(actual_home / ".config" / "git" / "config", require_directory=False)

    for directory in (project_root, *project_root.parents):
        add(directory / "package.json")

    return tuple(str(path) for path in paths)


# Worker 실행에 필요한 환경변수 구성
def _read_project_java_home(env_path: Path) -> Path | None:
    if not env_path.is_file():
        return None

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        if key.strip() != "JAVA_HOME":
            continue

        java_home = Path(value.strip().strip("\"'"))
        java_executable_name = "java.exe" if os.name == "nt" else "java"
        java_executable = java_home / "bin" / java_executable_name
        if not java_home.is_absolute() or not java_executable.is_file():
            raise RuntimeError(
                f"backend/.env.local JAVA_HOME is invalid: {java_home}"
            )
        return java_home

    return None


def validate_task_number(task_number: object) -> str:
    """Return a validated Harness task number for subprocess environment use."""

    if (
        isinstance(task_number, bool)
        or not isinstance(task_number, int)
        or task_number <= 0
    ):
        raise ValueError("Task number must be a positive integer.")
    return str(task_number)


def build_subprocess_environment(
    run_id: str,
    task_number: object,
    base_environment: dict[str, str] | None = None,
    project_root: Path = PROJECT_ROOT,
) -> dict[str, str]:
    task_number_text = validate_task_number(task_number)
    environment = (
        base_environment
        if base_environment is not None
        else os.environ
    ).copy()

    environment["CODEX_HOME"] = str(resolve_codex_home())

    gradle_user_home = project_root / "backend" / ".gradle-user-home"
    # A task contract can make backend read-only. Keep generic Worker
    # temporary files in the Harness-owned writable area instead.
    worker_temp = (
        project_root / ".agents" / "skills" / "harness-exec" / ".worker-tmp"
    )
    worker_home = worker_temp / "worker-home"

    worker_temp.mkdir(parents=True, exist_ok=True)
    worker_home.mkdir(parents=True, exist_ok=True)

    npm_cache = worker_temp / "npm-cache"
    npm_user_config = worker_home / ".npmrc"

    npm_cache.mkdir(parents=True, exist_ok=True)
    npm_user_config.touch(exist_ok=True)

    environment["NPM_CONFIG_CACHE"] = str(npm_cache)
    environment["NPM_CONFIG_USERCONFIG"] = str(npm_user_config)
    environment["NPM_CONFIG_UPDATE_NOTIFIER"] = "false"

    environment["GRADLE_USER_HOME"] = str(gradle_user_home)
    environment["TEMP"] = str(worker_temp)
    environment["TMP"] = str(worker_temp)
    environment["TMPDIR"] = str(worker_temp)
    environment["JAVA_TOOL_OPTIONS"] = " ".join(
        part
        for part in (
            environment.get("JAVA_TOOL_OPTIONS", ""),
            f'-Duser.home="{worker_home}"',
        )
        if part
    )

    java_home = _read_project_java_home(
        project_root / "backend" / ".env.local"
    )
    if java_home is not None:
        java_bin = str(java_home / "bin")
        current_path = environment.get("PATH", "")
        path_entries = current_path.split(os.pathsep) if current_path else []
        environment["JAVA_HOME"] = str(java_home)
        environment["PATH"] = os.pathsep.join(
            [java_bin, *(entry for entry in path_entries if entry != java_bin)]
        )

    environment["FLOW_BI_RUN_ID"] = run_id
    environment["FLOW_BI_TASK_NUMBER"] = task_number_text
    environment["FLOW_BI_PYTHON_EXECUTABLE"] = sys.executable
    environment.pop("FLOW_BI_NOTION_PARENT", None)
    environment.pop("FLOW_BI_" + "BROWSER_VERIFIER_URL", None)
    environment.pop("FLOW_BI_" + "BROWSER_VERIFIER_TOKEN", None)
    environment.pop("CODEX_PERMISSION_PROFILE", None)

    parent_session_id = environment.get("CODEX_THREAD_ID")
    if parent_session_id:
        environment["FLOW_BI_PARENT_SESSION_ID"] = parent_session_id
    else:
        environment.pop("FLOW_BI_PARENT_SESSION_ID", None)
    return environment
