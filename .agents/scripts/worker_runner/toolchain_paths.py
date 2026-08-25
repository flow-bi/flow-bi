from __future__ import annotations

from collections.abc import Iterable
from pathlib import Path
import shutil
import sys


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


def _append_unique_path(
    paths: list[Path],
    candidate: str | Path | None,
    *,
    require_directory: bool = False,
) -> None:
    if not candidate:
        return
    path = Path(candidate).expanduser()
    if require_directory and not path.is_dir():
        return
    if path not in paths:
        paths.append(path)


def _add_executable_paths(
    paths: list[Path],
    executable: str | Path,
    *,
    executable_first: bool = False,
) -> tuple[Path, Path]:
    executable_path = Path(executable)
    resolved_path = executable_path.resolve()
    candidates = (
        (executable_path, executable_path.parent, resolved_path, resolved_path.parent)
        if executable_first
        else (executable_path.parent, resolved_path.parent, executable_path, resolved_path)
    )
    for candidate in (*candidates, _homebrew_opt_package_root(executable_path), _homebrew_package_root(resolved_path)):
        _append_unique_path(paths, candidate)
    return executable_path, resolved_path


def _add_npm_paths(paths: list[Path], npm_paths: Iterable[Path]) -> None:
    for npm_path in npm_paths:
        _append_unique_path(paths, _npm_package_root(npm_path))
        _append_unique_path(paths, npm_path.parent / "node_modules" / "npm", require_directory=True)


def _add_windows_git_roots(paths: list[Path], git_paths: Iterable[Path]) -> None:
    for git_path in git_paths:
        if git_path.parent.name.lower() in {"bin", "cmd"}:
            _append_unique_path(paths, git_path.parent.parent, require_directory=True)


def collect_worker_readable_paths(
    environment: dict[str, str],
    *,
    home_dir: Path | None = None,
    platform_name: str | None = None,
    python_executable: str | Path = sys.executable,
    project_root: Path,
) -> tuple[str, ...]:
    """Collect ordered read-permission paths for the Worker toolchain only."""

    paths: list[Path] = []
    actual_home = home_dir or Path.home()
    actual_platform = platform_name or sys.platform
    _append_unique_path(paths, environment.get("JAVA_HOME"))
    _add_executable_paths(paths, python_executable, executable_first=True)

    for tool_name in ("node", "npm", "git"):
        executable = shutil.which(tool_name, path=environment.get("PATH"))
        if executable is None:
            continue
        executable_path, resolved_path = _add_executable_paths(paths, executable)
        if tool_name == "npm":
            _add_npm_paths(paths, (executable_path, resolved_path))
        elif tool_name == "git" and actual_platform == "win32":
            _add_windows_git_roots(paths, (executable_path, resolved_path))

    if actual_platform == "darwin":
        _append_unique_path(paths, "/Library/Developer/CommandLineTools")
        _append_unique_path(paths, "/System/Library/OpenSSL")
    _append_unique_path(paths, actual_home / ".gitconfig")
    _append_unique_path(paths, actual_home / ".config" / "git" / "config")
    for directory in (project_root, *project_root.parents):
        _append_unique_path(paths, directory / "package.json")
    return tuple(str(path) for path in paths)
