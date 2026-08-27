from __future__ import annotations

from pathlib import Path
import unittest


REPOSITORY_ROOT = Path(__file__).resolve().parents[4]


class HarnessWithoutWindowsAclTests(unittest.TestCase):
    def test_harness_does_not_own_a_windows_acl_lifecycle(self) -> None:
        acl_module = (
            REPOSITORY_ROOT
            / ".agents"
            / "scripts"
            / "worker_runner"
            / "verifiers"
            / "windows_acl.py"
        )
        cli_source = (
            REPOSITORY_ROOT
            / ".agents"
            / "skills"
            / "harness-exec"
            / "scripts"
            / "harness_runner"
            / "cli.py"
        ).read_text(encoding="utf-8")

        self.assertFalse(acl_module.exists())
        for removed_name in (
            "windows_acl",
            "AclRestorationError",
            "preserve_windows_acls",
            "worker_permission_paths",
        ):
            self.assertNotIn(removed_name, cli_source)


if __name__ == "__main__":
    unittest.main()
