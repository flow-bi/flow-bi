from __future__ import annotations

def validate_task_number(task_number: object) -> str:
    """양의 정수 Task 번호를 검증하고 환경 변수용 문자열로 반환한다."""

    # Python에서는 bool이 int의 하위 타입이므로 True, False를 별도로 거부한다.
    if (
        isinstance(task_number, bool)
        or not isinstance(task_number, int)
        or task_number <= 0
    ):
        raise ValueError("Task number must be a positive integer.")

    return str(task_number)