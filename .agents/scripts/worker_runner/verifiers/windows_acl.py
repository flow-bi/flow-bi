from __future__ import annotations

from collections.abc import Generator, Iterable
from contextlib import contextmanager
from pathlib import Path
from typing import Protocol
import ctypes
from ctypes import wintypes
import os
import sys

from ..config import build_worker_config


class AclRestorationError(RuntimeError):
    """Raised when a Worker ACL cannot be restored to its pre-run value."""


class AclBackend(Protocol):
    def capture(self, path: Path) -> bytes: ...

    def restore(self, path: Path, snapshot: bytes) -> None: ...


class WindowsAclBackend:
    """Capture and restore exact Windows DACLs without changing owner or group."""

    _SE_FILE_OBJECT = 1
    _DACL_SECURITY_INFORMATION = 0x00000004

    def __init__(self, project_root: Path) -> None:
        if os.name != "nt":
            raise OSError("Windows ACL backend은 Windows에서만 사용할 수 있습니다.")
        self.project_root = project_root.resolve()
        self._advapi32 = ctypes.WinDLL("advapi32", use_last_error=True)
        self._kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

        self._get_named_security_info = self._advapi32.GetNamedSecurityInfoW
        self._get_named_security_info.argtypes = (
            wintypes.LPWSTR,
            ctypes.c_int,
            wintypes.DWORD,
            ctypes.POINTER(ctypes.c_void_p),
            ctypes.POINTER(ctypes.c_void_p),
            ctypes.POINTER(ctypes.c_void_p),
            ctypes.POINTER(ctypes.c_void_p),
            ctypes.POINTER(ctypes.c_void_p),
        )
        self._get_named_security_info.restype = wintypes.DWORD

        self._to_sddl = self._advapi32.ConvertSecurityDescriptorToStringSecurityDescriptorW
        self._to_sddl.argtypes = (
            ctypes.c_void_p,
            wintypes.DWORD,
            wintypes.DWORD,
            ctypes.POINTER(ctypes.c_void_p),
            ctypes.POINTER(wintypes.DWORD),
        )
        self._to_sddl.restype = wintypes.BOOL

        self._from_sddl = self._advapi32.ConvertStringSecurityDescriptorToSecurityDescriptorW
        self._from_sddl.argtypes = (
            wintypes.LPCWSTR,
            wintypes.DWORD,
            ctypes.POINTER(ctypes.c_void_p),
            ctypes.POINTER(wintypes.DWORD),
        )
        self._from_sddl.restype = wintypes.BOOL

        self._set_file_security = self._advapi32.SetFileSecurityW
        self._set_file_security.argtypes = (
            wintypes.LPWSTR,
            wintypes.DWORD,
            ctypes.c_void_p,
        )
        self._set_file_security.restype = wintypes.BOOL

        self._local_free = self._kernel32.LocalFree
        self._local_free.argtypes = (ctypes.c_void_p,)
        self._local_free.restype = ctypes.c_void_p

    @staticmethod
    def _raise_last_error(message: str) -> None:
        error = ctypes.get_last_error()
        raise OSError(error, message, str(ctypes.WinError(error)))

    def capture(self, path: Path) -> bytes:
        descriptor = ctypes.c_void_p()
        dacl = ctypes.c_void_p()
        status = self._get_named_security_info(
            str(path),
            self._SE_FILE_OBJECT,
            self._DACL_SECURITY_INFORMATION,
            None,
            None,
            ctypes.byref(dacl),
            None,
            ctypes.byref(descriptor),
        )
        if status != 0:
            raise OSError(status, f"ACL 캡처 실패: {path}", str(ctypes.WinError(status)))
        sddl = ctypes.c_void_p()
        try:
            if not self._to_sddl(
                descriptor,
                1,
                self._DACL_SECURITY_INFORMATION,
                ctypes.byref(sddl),
                None,
            ):
                self._raise_last_error(f"ACL 문자열 변환 실패: {path}")
            return ctypes.wstring_at(sddl).encode("utf-8")
        finally:
            if sddl.value:
                self._local_free(sddl)
            if descriptor.value:
                self._local_free(descriptor)

    def restore(self, path: Path, snapshot: bytes) -> None:
        descriptor = ctypes.c_void_p()
        if not self._from_sddl(
            snapshot.decode("utf-8"),
            1,
            ctypes.byref(descriptor),
            None,
        ):
            self._raise_last_error(f"ACL snapshot 파싱 실패: {path}")
        try:
            if not self._set_file_security(
                str(path),
                self._DACL_SECURITY_INFORMATION,
                descriptor,
            ):
                self._raise_last_error(f"ACL 복원 실패: {path}")
        finally:
            if descriptor.value:
                self._local_free(descriptor)


def worker_permission_paths(
    writable_paths: Iterable[str],
    read_only_paths: Iterable[str],
) -> tuple[str, ...]:
    """Return repository paths represented by the effective Worker profile."""
    config = build_worker_config(writable_paths, read_only_paths)
    profile_name = config["default_permissions"]
    permissions = config["permissions"]
    profile = permissions[profile_name]
    workspace_roots = profile["filesystem"][":workspace_roots"]
    normalized: list[str] = []
    for raw_path in workspace_roots:
        path = raw_path.replace("\\", "/").rstrip("/")
        if path.endswith("/**"):
            path = path[:-3].rstrip("/")
        if "*" not in path and path not in normalized:
            normalized.append(path)
    return tuple(normalized)


def _existing_paths(project_root: Path, paths: Iterable[str]) -> tuple[Path, ...]:
    selected: set[Path] = set()
    for raw_path in paths:
        candidate = (project_root / raw_path).resolve()
        try:
            candidate.relative_to(project_root)
        except ValueError as error:
            raise ValueError(f"ACL 검증 경로가 저장소를 벗어납니다: {raw_path}") from error
        while not candidate.exists() and candidate != project_root:
            candidate = candidate.parent
        selected.add(candidate)
    return tuple(sorted(selected, key=lambda item: (len(item.parts), str(item).casefold())))


@contextmanager
def preserve_windows_acls(
    project_root: Path,
    paths: Iterable[str],
    *,
    backend: AclBackend | None = None,
) -> Generator[None, None, None]:
    """Restore changed ACLs once after an entire parallel Worker cohort exits."""
    root = project_root.resolve()
    if backend is None:
        if os.name != "nt":
            yield
            return
        backend = WindowsAclBackend(root)

    try:
        snapshots = {
            path: backend.capture(path)
            for path in _existing_paths(root, paths)
        }
    except OSError as error:
        raise AclRestorationError(f"Windows ACL 캡처 실패: {error}") from error
    try:
        yield
    finally:
        failures: list[str] = []
        for path, snapshot in snapshots.items():
            try:
                current = backend.capture(path)
                if current == snapshot:
                    continue
                backend.restore(path, snapshot)
                if backend.capture(path) != snapshot:
                    raise OSError("복원 후 ACL이 실행 전 값과 다릅니다.")
            except OSError as error:
                relative = path.relative_to(root)
                failures.append(f"{relative}: {error}")
        if failures:
            restoration_error = AclRestorationError(
                "Windows ACL 복원 검증 실패: " + "; ".join(failures)
            )
            active_error = sys.exception()
            if active_error is not None:
                restoration_error.add_note(f"Worker 실행 오류: {active_error}")
            raise restoration_error from active_error
