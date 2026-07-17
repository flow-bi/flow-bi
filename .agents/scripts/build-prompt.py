from pathlib import Path
import json
import os
import re
import shutil
import subprocess
import sys
import tomllib


DEFAULT_TIMEOUT_SECONDS = 30 * 60

# 첫 번째 $스킬이름 추출 및 삭제
SKILL_INVOCATION = re.compile(
    r"^\s*\$([A-Za-z0-9_-]+)(?=\s|:|$)\s*:?\s*"
)


def resolve_config_path() -> Path:
    if len(sys.argv) <= 1:
        raise ValueError("전달할 프롬프트가 없습니다.")

    raw_prompt = " ".join(sys.argv[1:])
    match = SKILL_INVOCATION.match(raw_prompt)

    if match is None:
        raise ValueError("프롬프트 앞에 $skill-name이 없습니다.")

    skill_name = match.group(1)

    return (
        Path(__file__).resolve().parent.parent
        /"skills"
        / skill_name
        / "config.toml"
    )


CONFIG_PATH = resolve_config_path()

def strip_skill_invocation(text: str) -> str:
    """Remove a leading $skill-name invocation."""
    return SKILL_INVOCATION.sub("", text, count=1)



def read_prompt() -> str:
    """Read a prompt from command-line arguments or standard input."""
    if len(sys.argv) > 1:
        raw_prompt  = " ".join(sys.argv[1:])
    else:
        raise ValueError("전달할 프롬프트가 없습니다.")

    skill_stripped_prompt  = strip_skill_invocation(raw_prompt)

    if not skill_stripped_prompt .strip():
        raise ValueError("전달할 프롬프트가 비어 있습니다.")

    return skill_stripped_prompt 

# configured = os.environ.get("WORKER_CODEX") 등으로 환경변수에 사용자가 직접 실행경로 지정할 수도
def resolve_codex_executable() -> str:
    candidates = ["codex", "codex.cmd"]

    for candidate in candidates:
        if candidate and (resolved := shutil.which(candidate)):
            return resolved

    raise RuntimeError(
        "Codex CLI를 찾을 수 없습니다. codex를 PATH에 추가하세요"
    )


def resolve_codex_home() -> Path:
    return Path.home() / ".codex"


def format_toml_key(key: str) -> str:
    """Format one TOML dotted-key segment."""
    return key if re.fullmatch(r"[A-Za-z0-9_-]+", key) else json.dumps(key)


def format_toml_value(value: object) -> str:
    """Serialize supported config values for a Codex -c override."""
    if isinstance(value, str):
        return json.dumps(value)
    if isinstance(value, bool):
        return str(value).lower()
    if isinstance(value, (int, float)):
        return repr(value)
    if isinstance(value, list):
        return "[" + ", ".join(format_toml_value(item) for item in value) + "]"
    if isinstance(value, dict):
        entries = (
            f"{format_toml_key(key)} = {format_toml_value(item)}"
            for key, item in value.items()
        )
        return "{ " + ", ".join(entries) + " }"

    raise TypeError(f"지원하지 않는 config.toml 값 형식입니다: {type(value).__name__}")


def iter_config_overrides(values: dict[str, object]):
    """Yield one Codex -c override for each top-level TOML value."""
    for key, value in values.items():
        yield f"{format_toml_key(key)}={format_toml_value(value)}"


def read_config_overrides() -> list[str]:
    """Read this skill's config.toml as Codex -c key=value overrides."""
    with CONFIG_PATH.open("rb") as config_file:
        config = tomllib.load(config_file)
    return list(iter_config_overrides(config))


def build_codex_command() -> list[str]:
    command = [resolve_codex_executable(), "exec"]

    for override in read_config_overrides():
        command.extend(["-c", override])

    command.append("-")
    return command


def build_subprocess_environment() -> dict[str, str]:
    environment = os.environ.copy()
    environment["CODEX_HOME"] = str(resolve_codex_home())
    return environment


def main() -> None:
    subprocess.run(
        build_codex_command(),
        timeout=DEFAULT_TIMEOUT_SECONDS,
        input=read_prompt(),
        text=True,
        encoding="utf-8",
        env=build_subprocess_environment(),
        check=True,
    )


if __name__ == "__main__":
    main()
