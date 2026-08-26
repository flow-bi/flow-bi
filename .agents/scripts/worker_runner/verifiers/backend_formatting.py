from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from pathlib import Path
import os
import secrets
import shutil
import subprocess
import tempfile


@dataclass(frozen=True)
class FormatterScope:
    allowed_paths: tuple[Path, ...]
    forbidden_paths: tuple[Path, ...]


def _within(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
    except ValueError:
        return False
    return True


class BackendFormatter:
    def __init__(
        self, project_root: Path, backend_directory: Path, wrapper_name: str,
        runner: Callable[..., subprocess.CompletedProcess[str]], environment: Callable[[], dict[str, str]],
    ) -> None:
        self._root = project_root
        self._backend = backend_directory
        self._wrapper_name = wrapper_name
        self._runner = runner
        self._environment = environment

    def scope(self, allowed_paths: Sequence[str], forbidden_paths: Sequence[str]) -> FormatterScope:
        return FormatterScope(
            tuple(self._contract_path(value) for value in allowed_paths),
            tuple(self._contract_path(value) for value in forbidden_paths),
        )

    def targets(self, values: object, scope: FormatterScope) -> tuple[Path, ...]:
        if not isinstance(values, list) or not values:
            raise ValueError("Formatter requires Backend Java files")
        targets: list[Path] = []
        for value in values:
            relative = self._contract_path(value)
            if relative.suffix != ".java" or relative.parts[0] != "backend":
                raise ValueError("Formatter only accepts Backend Java files")
            if not any(_within(relative, path) for path in scope.allowed_paths) or any(
                _within(relative, path) for path in scope.forbidden_paths
            ):
                raise ValueError("Formatter path is outside the Task scope")
            target = self._root / relative
            if target.is_symlink() or not target.is_file() or not _within(target, self._backend):
                raise ValueError("Formatter target must be a regular Backend file")
            if target.resolve() != target or not _within(target.resolve(), self._backend):
                raise ValueError("Formatter target escapes the repository")
            if target not in targets:
                targets.append(target)
        return tuple(targets)

    def format(self, targets: tuple[Path, ...], timeout: int):
        from .backend_service import BackendVerificationResult

        with tempfile.TemporaryDirectory(prefix="flow-bi-spotless-") as temporary:
            workspace = Path(temporary) / "backend"
            try:
                self._create_workspace(workspace, targets)
                result = self._runner(
                    [str(workspace / self._wrapper_name), "spotlessApply", "--no-daemon"],
                    cwd=workspace, env=self._environment(), timeout=timeout, text=True, encoding="utf-8",
                    errors="replace", stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False,
                )
            except subprocess.TimeoutExpired as error:
                return BackendVerificationResult(124, _timeout_output(error), timed_out=True)
            except (OSError, shutil.Error) as error:
                return BackendVerificationResult(1, f"Backend Java formatter could not start: {error}")
            if result.returncode != 0:
                return BackendVerificationResult(result.returncode, result.stdout or "")
            try:
                self._apply_workspace(workspace, targets)
            except OSError:
                return BackendVerificationResult(1, "Formatted output could not be applied safely.")
            return BackendVerificationResult(0, result.stdout or "")

    def _contract_path(self, value: object) -> Path:
        if not isinstance(value, str) or not value:
            raise ValueError("Formatter Task path is invalid")
        path = Path(value)
        if path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts):
            raise ValueError("Formatter Task path is invalid")
        return Path(*path.parts)

    def _create_workspace(self, workspace: Path, targets: tuple[Path, ...]) -> None:
        workspace.mkdir(parents=True)
        for relative in (self._wrapper_name, "settings.gradle", "build.gradle", "gradle", "config"):
            source, destination = self._backend / relative, workspace / relative
            if source.is_symlink() or not source.exists():
                raise OSError("Formatter configuration is invalid")
            if source.is_dir():
                shutil.copytree(source, destination, symlinks=False)
            else:
                shutil.copy2(source, destination)
        for target in targets:
            destination = workspace / target.relative_to(self._backend)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, destination)

    def _apply_workspace(self, workspace: Path, targets: tuple[Path, ...]) -> None:
        replacements: list[tuple[Path, Path]] = []
        for target in targets:
            if target.is_symlink() or not target.is_file() or target.resolve() != target:
                raise OSError("Formatter target changed")
            formatted = workspace / target.relative_to(self._backend)
            if formatted.is_symlink() or not formatted.is_file():
                raise OSError("Formatter output is invalid")
            staged = target.with_name(f".{target.name}.{secrets.token_hex(8)}.tmp")
            shutil.copy2(formatted, staged)
            replacements.append((target, staged))
        try:
            for target, staged in replacements:
                os.replace(staged, target)
        finally:
            for _target, staged in replacements:
                staged.unlink(missing_ok=True)


def _timeout_output(error: subprocess.TimeoutExpired) -> str:
    output = error.stdout if error.stdout is not None else error.output
    return output.decode("utf-8", errors="replace") if isinstance(output, bytes) else output or ""
