from pathlib import Path


def find_repository_root() -> Path:
    current = Path(__file__).resolve().parent

    for directory in (current, *current.parents):
        if (directory / ".git").exists():
            return directory

    raise RuntimeError("저장소 루트를 찾을 수 없습니다.")


PROJECT_ROOT = find_repository_root()