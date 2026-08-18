# Architecture Decision Records

## 목적

이 디렉터리는 구현 전에 사람의 판단이 필요한 기술·구조 결정을 검토 가능한 기록으로 남긴다. ADR은 Product Spec이나 Design Doc의 기능 요구사항을 대체하지 않으며, 상위 문서와 충돌하면 승인 전에 문서를 정렬해야 한다.

## 상태

- `PROPOSED`: 선택지와 권장안이 기록됐지만 사람 승인을 기다리는 상태
- `ACCEPTED`: 사람이 결정을 명시적으로 승인한 상태
- `REJECTED`: 제안을 채택하지 않기로 결정한 상태
- `SUPERSEDED`: 후속 ADR로 대체된 상태

AI Agent는 사람의 명시적 승인 없이 ADR을 `ACCEPTED`로 변경하지 않는다. `PROPOSED` ADR에 의존하는 구현은 시작하거나 완료 상태로 보고할 수 없다.

## 파일명과 변경 규칙

- 파일명은 `NNNN-kebab-case-title.md` 형식을 사용한다.
- 승인된 ADR의 번호와 파일명은 변경하지 않는다.
- `PROPOSED` 상태에서는 검토 의견을 같은 문서에 반영할 수 있다.
- `ACCEPTED` 이후 결정 의미를 바꾸려면 후속 ADR을 작성하고 기존 ADR을 `SUPERSEDED`로 연결한다.
- 각 ADR에는 Context, 선택지, 권장안, Consequences, 검증 방법과 사람 승인 기록을 포함한다.

