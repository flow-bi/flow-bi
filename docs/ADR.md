# Architecture Decision Records

## 목적

이 문서는 `flow-bi`의 주요 아키텍처 결정을 빠르게 확인하는 인덱스다. 결정의 전체 맥락, 대안과 구현 제약은 `docs/adr-detail/`의 상세 문서에서 관리한다.

## 기록 규칙

- 새 결정은 `ADR-001`부터 증가하는 3자리 번호를 사용한다.
- 이 파일에는 상태, 무엇을 변경했는지, 결정 근거와 상세 문서 링크만 기록한다.
- 상세 기록은 `docs/adr-detail/ADR-NNN.md`에 작성한다.
- 결정을 변경할 때는 기존 기록을 삭제하지 않고 새 ADR을 추가한 뒤 대체 관계를 연결한다.
- 상태는 `Proposed`, `Accepted`, `Deprecated`, `Superseded` 중 하나를 사용한다.
- 새 상세 문서는 [상세 ADR 템플릿](adr-detail/_template.md)을 사용한다.

## 결정 목록

### ADR-001 — 브라우저 인증 세션 관리 변경

> 상태: `Accepted`

**변경 내용**

브라우저 인증을 JWT에서 Redis 기반 Spring Session으로 변경하고 `user_tokens`를 제거하며 `user_credentials.must_change_password`를 추가한다.

**결정 근거**

사용자별 세션의 즉시·선택적 무효화와 다중 Backend 인스턴스의 인증 상태 공유가 필요하다.

**상세 기록**

[ADR-001 상세 문서](adr-detail/ADR-001.md)
