from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


WORKER_SCRIPTS = Path(__file__).resolve().parents[3] / "scripts"
if str(WORKER_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(WORKER_SCRIPTS))

from worker_runner import WorkerExecutionRequest, execute_worker


class WorkerRunScopedTempTests(unittest.TestCase):
    def test_uses_external_run_scoped_temp_and_cleans_it(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            project_root = Path(temporary) / "workspace"
            project_root.mkdir()
            system_temp = Path(temporary) / "system-temp"
            system_temp.mkdir()
            captured_temp: list[Path] = []
            captured_command: list[str] = []

            def run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
                worker_temp = Path(kwargs["env"]["TMPDIR"])
                captured_temp.append(worker_temp)
                captured_command.extend(command)
                output_path = Path(command[command.index("-o") + 1])
                output_path.write_text('{"final_status":"PASS"}', encoding="utf-8")
                (worker_temp / "artifact.txt").write_text("temporary", encoding="utf-8")
                return subprocess.CompletedProcess(command, 0)

            request = WorkerExecutionRequest(
                task_number=1,
                common_prompt="common",
                additional_request="",
                title="task",
                task_prompt="requirements",
                task_execution_context={},
                decision_correction=None,
                verification_result_collection=None,
                executable="codex",
                config_overrides=(),
                environment={},
                project_root=project_root,
            )
            with mock.patch(
                "worker_runner.runner.tempfile.gettempdir", return_value=str(system_temp)
            ):
                result = execute_worker(request, process_runner=run)

            self.assertEqual(result.returncode, 0)
            self.assertFalse(captured_temp[0].is_relative_to(project_root))
            self.assertFalse(captured_temp[0].exists())
            command_text = " ".join(captured_command)
            self.assertIn(json.dumps(str(captured_temp[0])), command_text)
            self.assertIn("/**", command_text)


if __name__ == "__main__":
    unittest.main()
