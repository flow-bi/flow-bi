from __future__ import annotations

import re
import sys


# 프롬프트 맨 앞의 $스킬이름을 찾기 위한 정규식
# 지원 형식:
#   $be-worker 작업 요청
#   $be-worker: 작업 요청
SKILL_INVOCATION = re.compile(
    r"^\s*\$([A-Za-z0-9_-]+)(?=\s|:|$)\s*:?\s*"
)


def parse_invocation(raw_prompt: str) -> tuple[str, str]:
    """프롬프트 앞의 스킬 호출과 실제 위임 요청을 분리"""
    match = SKILL_INVOCATION.match(raw_prompt)
    if match is None:
        raise ValueError("프롬프트는 반드시 $스킬이름으로 시작해야 합니다.")

    # 앞쪽의 $스킬이름을 제거하고 실제 작업 요청만 추출한다.
    prompt = SKILL_INVOCATION.sub("", raw_prompt, count=1).strip()
    if not prompt:
        raise ValueError("위임할 작업 요청이 비어 있습니다.")
    
    skill_name = match.group(1)

    return skill_name, prompt


def read_invocation(arguments: list[str] | None = None) -> tuple[str, str]:
    """명령줄 인자에서 worker 호출 정보를 읽고 파싱"""
    values = sys.argv[1:] if arguments is None else arguments
    if not values:
        raise ValueError("위임할 프롬프트가 전달되지 않았습니다.")
    
    raw_prompt = " ".join(values)
    return parse_invocation(raw_prompt)
