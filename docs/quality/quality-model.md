# Quality Model

## 1. 문서 목적

이 문서는 `flow-bi`에서 Active Plan, Task, Worker 결과와 전체 기능의 품질을 일관되게 판정하기 위한 기준을 정의한다.

품질 판정은 다음 두 단계로 수행한다.

1. **Mandatory Gate**: 반드시 충족해야 하는 차단 조건
2. **Quality Score**: Mandatory Gate를 모두 통과한 결과의 품질 수준 평가

점수가 높아도 Mandatory Gate 실패를 상쇄할 수 없다.

## 2. 적용 범위

이 모델은 다음 작업에 적용한다.

- `harness-plan`이 생성하는 Active Plan 검증
- `harness-execute`가 실행하는 Task 검증
- Frontend 및 Backend 코드 구현
- 버그 수정과 리팩터링
- API와 DB 스키마 변경
- 보안 및 인증·인가 변경
- 문서와 설정 변경
- Review Aggregator의 최종 판정

작업 유형에 적용할 수 없는 항목은 임의로 만점을 부여하지 않는다. `N/A` 사유를 기록한 뒤 적용 가능한 항목의 비중을 100점으로 환산한다.

## 3. 품질 판정 상태

| 상태 | 의미 |
| --- | --- |
| `PASS` | Mandatory Gate 통과 및 최소 Quality Score 충족 |
| `PASS_WITH_FOLLOW_UP` | 완료는 가능하지만 승인된 후속 작업이 필요함 |
| `RETRY` | 수정 후 자동 재시도 가능 |
| `HUMAN_REVIEW_REQUIRED` | 사람의 판단 또는 승인이 필요함 |
| `FAILED` | 완료 조건 미충족 또는 재시도 한도 도달 |
| `BLOCKED` | 외부 결정·권한·문서가 없어 진행할 수 없음 |

`PASS_WITH_FOLLOW_UP`은 Mandatory Gate 실패를 우회하는 용도로 사용할 수 없다. 후속 작업은 기능 안전성과 핵심 요구사항에 영향을 주지 않는 경미한 개선에만 허용한다.

## 4. Mandatory Gate

다음 Gate는 점수와 무관하게 모두 통과해야 한다.

### G1. Permission 및 보안

- 시스템 Permission과 `SECURITY.md`를 위반하지 않았다.
- 비밀정보, 비밀번호, Token 또는 보호 대상 개인정보가 노출되지 않았다.
- 인증·인가를 우회하지 않았다.
- 보안 또는 Permission 위반이 발견되면 자동 재시도하지 않는다.

실패 상태: `HUMAN_REVIEW_REQUIRED` 또는 `FAILED`.

### G2. Active Plan 및 범위

- 실행에 유효하고 승인된 Active Plan이 존재한다.
- Worker가 담당 Task와 수정 가능 경로 안에서만 작업했다.
- 수정 금지 경로와 제외 범위를 침범하지 않았다.
- 관련 없는 리팩터링이나 기술 교체를 포함하지 않았다.

실패 상태: 안전하게 되돌릴 수 있는 범위 오류는 `RETRY`, 의도적·광범위한 위반은 `HUMAN_REVIEW_REQUIRED`.

사람의 요청처럼 직접 허용한 비실행 작업은 Active Plan 예외가 될 수 있다. 예외 근거를 작업 결과에 기록한다.

### G3. 요구사항과 완료 조건

- Task의 필수 완료 조건을 모두 충족했다.
- 관련 FR/NFR과 Product Spec의 의미를 변경하지 않았다.
- 제외 범위를 완료한 것처럼 보고하지 않았다.
- 실패 조건에 해당하지 않는다.

실패 상태: 수정 가능한 경우 `RETRY`, 요구사항 결정이 필요하면 `BLOCKED` 또는 `HUMAN_REVIEW_REQUIRED`.

### G4. TDD 및 필수 테스트

코드 구현과 버그 수정 Task에 적용한다.

- `Red → Green → Refactor` 증거가 있다.
- Red 단계가 의도한 이유로 실패했다.
- Green 및 최종 단계에서 관련 테스트가 통과했다.
- 버그 수정에는 재현 및 회귀 테스트가 있다.
- 테스트 삭제, 단언 약화 또는 검증 우회가 없다.
- TDD 예외가 있다면 구현 전에 Active Plan에서 승인되었다.

실패 상태: `RETRY`. 승인된 예외 없이 증거를 복구할 수 없으면 `HUMAN_REVIEW_REQUIRED`.

문서, 단순 설정, 자동 생성 코드 등 TDD가 부적절한 작업에는 `N/A`와 대체 검증을 기록한다.

### G5. 자동 검증

- Active Plan에 정의된 Build, Test, Type Check, Static Analysis 및 Formatting이 통과했다.
- 실패한 검증을 숨기거나 성공으로 표시하지 않았다.
- 실행하지 못한 검증은 이유와 영향을 기록하고 사람의 승인을 받았다.

기본 검증 후보:

| 영역 | 검증 |
| --- | --- |
| Frontend | Type Check, Lint, Test, Build |
| Backend | `spotlessCheck`, Test, Build |
| DB | Migration 검증, Mapping·Constraint Test |
| 문서 | Link·구조·필수 항목·상호 참조 검사 |

구체적인 명령은 각 Active Plan과 `harness/config/verification.json`에서 확정한다.

### G6. 계약 동기화

- 사용자 동작 변경 시 Product Spec 또는 Design Doc을 갱신했다.
- API 변경 시 `backend/API.md`를 갱신했다.
- DB 변경 시 ERD, `backend/DB_SCHEMA.md`와 Migration을 갱신했다.
- Architecture 또는 보안 결정 변경 시 ADR과 정책 문서를 갱신했다.
- 코드와 문서 사이에 알려진 모순을 숨기지 않았다.

실패 상태: `RETRY` 또는 중요한 결정이면 `HUMAN_REVIEW_REQUIRED`.

### G7. Critical Review Finding

- 해결되지 않은 Critical 또는 Blocker Review Finding이 없다.
- 데이터 손실, 권한 우회, 핵심 기능 오동작 또는 호환성 파괴 위험이 없다.
- 남은 문제를 완료 결과에서 누락하지 않았다.

실패 상태: `FAILED`, `BLOCKED` 또는 `HUMAN_REVIEW_REQUIRED`.

## 5. Quality Score

Mandatory Gate를 모두 통과한 뒤 다음 기준으로 100점 만점의 `quality_score`를 계산한다.

| 항목 | 배점 | 핵심 질문 |
| --- | ---: | --- |
| 요구사항 정확성 | 25 | 요청과 인수 조건을 정확히 충족하는가 |
| 테스트 및 검증 | 20 | 적절한 계층과 경계 조건을 검증했는가 |
| 보안 및 데이터 정합성 | 15 | 권한, 민감정보, 상태와 트랜잭션이 안전한가 |
| 아키텍처 및 범위 준수 | 15 | 모듈·계층·의존성과 변경 범위를 지켰는가 |
| 유지보수성 | 10 | 코드와 설계가 이해·변경하기 쉬운가 |
| 문서 및 추적성 | 10 | 요구사항·API·DB·결과 증거가 연결되는가 |
| 사용자 품질 | 5 | 오류·접근성·응답 상태가 적절한가 |
| **합계** | **100** | |

### 5.1 요구사항 정확성 — 25점

| 점수 | 기준 |
| ---: | --- |
| 25 | 모든 필수 시나리오와 경계 조건을 정확히 충족 |
| 20 | 핵심 요구사항 충족, 경미한 비차단 개선만 존재 |
| 15 | 주요 기능은 동작하지만 일부 승인된 후속 작업 존재 |
| 0~10 | 핵심 요구사항 누락 또는 잘못된 동작; Mandatory Gate 재검토 |

### 5.2 테스트 및 검증 — 20점

- 정상·실패·경계 시나리오 적절성: 6점
- TDD 증거와 회귀 방지: 5점
- 테스트 계층 및 실제성: 4점
- 전체 자동 검증 결과: 3점
- 동시성·시간·외부 경계 등 위험 기반 테스트: 2점

### 5.3 보안 및 데이터 정합성 — 15점

- 인증·인가와 객체 수준 권한: 5점
- 입력·출력 및 민감정보 보호: 3점
- 트랜잭션·상태 전이·동시성: 4점
- 로그·감사 및 안전한 오류: 3점

보안과 데이터 정합성이 적용되지 않는 순수 문서 작업은 `N/A`로 처리할 수 있다. 보안 정책 문서 작업은 이 항목을 `N/A`로 처리할 수 없다.

### 5.4 아키텍처 및 범위 준수 — 15점

- Active Plan 범위 준수: 5점
- 모듈과 계층 의존성 준수: 5점
- 불필요한 변경·의존성·중복 방지: 3점
- ADR 및 결정 경계 준수: 2점

### 5.5 유지보수성 — 10점

- 명확한 이름과 책임: 3점
- 복잡도와 중복 관리: 2점
- 오류 처리와 관측 가능성: 2점
- Formatting과 Convention 준수: 2점
- 과도한 TODO 또는 임시 코드 없음: 1점

### 5.6 문서 및 추적성 — 10점

- 요구사항과 Task 연결: 3점
- API·DB·설계 문서 동기화: 3점
- 검증 결과와 실행 증거: 2점
- 남은 문제와 기술 부채 기록: 2점

### 5.7 사용자 품질 — 5점

Frontend 또는 사용자에게 보이는 API에 적용한다.

- Loading·Empty·Error·Permission 상태: 2점
- 접근성 및 반응형 동작: 2점
- 사용자가 이해할 수 있는 메시지와 피드백: 1점

사용자 UI가 없는 내부 작업은 `N/A`로 처리한다.

## 6. N/A 점수 환산

적용 가능한 항목 점수 합계를 기준으로 다음과 같이 환산한다.

```text
quality_score = round((획득 점수 / 적용 가능 총점) × 100)
```

예:

```text
사용자 품질 5점이 N/A인 Backend 내부 작업
획득 점수: 86점
적용 가능 총점: 95점
quality_score = round(86 / 95 × 100) = 91
```

`N/A`는 적용하기 어렵다는 이유만으로 사용할 수 없다. 평가자는 사유와 대체 평가 근거를 기록해야 한다.

## 7. 통과 기준

기본 최소 통과점수는 다음과 같다.

| 결과 | 조건 |
| --- | --- |
| `PASS` | Mandatory Gate 모두 통과 및 `quality_score ≥ 85` |
| `PASS_WITH_FOLLOW_UP` | Gate 통과, `quality_score ≥ 85`, 승인된 비차단 후속 작업 존재 |
| `RETRY` | Gate 수정 가능 또는 `70 ≤ quality_score < 85` |
| `FAILED` | `quality_score < 70`, 재시도 3회 도달 또는 필수 조건 복구 불가 |

Active Plan은 위험도에 따라 최소 점수를 85보다 높게 설정할 수 있지만 낮출 수 없다. 보안·인증, 권한, 개인정보, DB Migration과 동시성 작업은 최소 90점을 SHOULD 요구한다.

## 8. 작업 유형별 필수 검증

### 8.1 Frontend

- 사용자 시나리오와 Form 검증
- Loading, Empty, Error, Permission 상태
- Type 안정성과 Build
- 키보드 사용과 기본 접근성
- API 계약 일치
- 서버 상태와 클라이언트 상태 분리

### 8.2 Backend

- Domain 및 Service 규칙
- 입력 검증과 오류 코드
- 인증·인가와 IDOR 방지
- Transaction과 실패 시 Rollback
- Repository Mapping과 Query
- 시간·상태·동시성 경계
- Spotless Formatting

### 8.3 Database

- Migration 적용·Rollback 또는 복구 전략
- FK, UNIQUE, CHECK, Index와 삭제 정책
- 기존 데이터 보존
- PostgreSQL 호환성
- H2 Test만으로 PostgreSQL 동작을 대체하지 않았는지 확인
- 직원·팀 비활성화와 일정·예약 취소 또는 Soft Delete 시 기존 참조와 감사 이력이 보존되는지 확인

현재 `DB_SCHEMA.md`는 Initial Baseline이므로 승인된 Schema Review 이전에는 개선안을 구현 필수조건으로 사용하지 않는다.

### 8.4 일정 공개 정책

- 일정 유형이 개인·팀·프로젝트 중 정확히 하나인지 검증
- 팀 일정의 다중 팀, 프로젝트 일정의 다중 프로젝트 연결 검증
- 여러 참석자 연결과 참석자 조회 권한 검증
- 유형과 맞지 않는 팀·프로젝트 대상 조합 거부 검증
- 개인·팀·프로젝트별 공개 대상과 비대상 사용자의 접근 거부 검증

### 8.5 Documentation

- 필수 섹션 존재
- 용어와 경로 일관성
- 상위 정책과 충돌 없음
- 내부 Link와 상호 참조 유효성
- 확정·제안·TBD·검토 대기 구분
- 실제 상태와 문서 설명 일치

### 8.6 Security

- 미인증과 권한 부족 요청 거부
- 객체 수준 권한과 관리자 권한
- Token 만료·폐기·로그아웃
- 민감정보 로그·응답 노출 방지
- 안전한 오류와 감사 가능성

초기 테스트 편의를 위해 Spring Security가 주석 처리된 상태는 인증 기능의 완료 상태가 아니다. 보호 API를 완료하려면 Security 활성화와 관련 테스트가 필요하다.

## 9. 비기능 요구사항 평가

### NFR-001 인증

- 로그인 사용자만 보호 기능을 사용할 수 있어야 한다.
- 공개 Endpoint 목록은 명시적으로 관리한다.

### NFR-002 비밀번호 보호

- 비밀번호는 검증된 단방향 Hash로 저장한다.
- 평문, 복호화 가능한 형태와 로그 출력은 실패 조건이다.

### NFR-003 캘린더 응답 시간

현재 요구사항: 3초 이내.

측정 전 다음을 Active Plan에서 명시해야 한다.

- 데이터 규모
- 조회 기간과 일정 수
- Server 응답과 Client Rendering 중 측정 범위
- 반복 횟수와 Percentile
- 실행 환경

측정 기준이 확정되기 전에는 3초 충족을 최종 검증했다고 보고하지 않는다.

### NFR-004 AI 응답 시간

현재 요구사항: 평균 5초 이내. AI 기능 도입 시 첫 응답 시간과 전체 응답 시간을 분리하고 측정 환경과 표본 수를 정의한다.

### NFR-005 가용성

현재 요구사항: 24시간 사용 가능. 배포 환경 확정 후 목표 가용률, 측정 기간, 계획된 점검 제외 여부와 장애 복구 기준을 정의한다.

### NFR-006 PC 및 Mobile

- 핵심 기능을 PC와 Mobile에서 수행할 수 있어야 한다.
- 지원 Browser, 최소 화면 폭과 Device Matrix는 Frontend Plan에서 정의한다.

### NFR-007 확장성

- 새 기능은 기존 도메인의 내부 구현을 무분별하게 침범하지 않아야 한다.
- 순환 의존과 공통 모듈의 비즈니스 규칙 집중을 허용하지 않는다.

## 10. 재시도 정책

- 최초 실행을 포함해 Task당 최대 3회다.
- 각 재시도에는 이전 실패 원인과 구체적인 수정 피드백을 전달한다.
- 같은 실패도 시도 횟수에 포함한다.
- 보안 또는 Permission 위반은 자동 재시도하지 않는다.
- 3회 안에 Gate와 점수를 충족하지 못하면 `FAILED`로 판정하고 사람에게 보고한다.
- 추가 실행은 사람의 명시적 승인 후 새로운 실행으로 시작한다.

## 11. 사람 검토가 필요한 조건

- 보안·Permission 위반
- 요구사항 또는 설계 문서 충돌
- DB 파괴적 변경이나 데이터 손실 가능성
- 인증·권한·개인정보 정책 변경
- 공개 API 호환성 파괴
- TDD 또는 필수 검증 예외 요청
- Quality Gate 완화 요청
- Worker 리뷰 간 결론 충돌
- NFR 측정 기준이 없어 통과 여부를 판단할 수 없음
- 3회 재시도 실패

## 12. 검증 증거 형식

Task 결과에는 최소한 다음을 기록한다.

```yaml
task_id: Task 01
mandatory_gates:
  permission_security: PASS
  scope: PASS
  requirements: PASS
  tdd: PASS | N/A
  automated_verification: PASS
  contract_sync: PASS
  critical_findings: PASS
quality_score: 0
quality_breakdown:
  requirements: 0
  testing: 0
  security_integrity: 0
  architecture_scope: 0
  maintainability: 0
  documentation_traceability: 0
  user_quality: 0 | N/A
verification:
  - command: none
    result: PASS | FAIL | NOT_RUN
remaining_issues: none
decision: PASS | PASS_WITH_FOLLOW_UP | RETRY | HUMAN_REVIEW_REQUIRED | FAILED | BLOCKED
```

실제 저장 형식은 Harness 설정에서 JSON으로 변환할 수 있으나 필드의 의미를 변경해서는 안 된다.

## 13. Active Plan 작성 규칙

각 Task의 완료 조건에는 다음을 포함해야 한다.

- 적용되는 Mandatory Gate
- 최소 `quality_score`; 기본 85 이상
- 실행할 검증 명령 또는 검증 절차
- TDD 적용 여부와 예외
- 요구사항 ID
- 문서 갱신 대상
- 사람 승인 조건
- 실패 조건

Plan 작성자는 점수를 높게 받기 위한 모호한 표현을 사용하지 않고 관찰·실행 가능한 조건으로 작성해야 한다.

## 14. Quality Model 변경 관리

다음 변경은 사람의 승인이 필요하다.

- Mandatory Gate 추가·삭제·완화
- 최소 통과점수 변경
- 점수 배점 변경
- 보안 또는 TDD 예외 범위 변경
- 재시도 한도 변경
- `PASS_WITH_FOLLOW_UP` 허용 범위 변경

변경 시 `AGENTS.md`, Active Plan Template, Harness Verification 설정과 Review Aggregator를 함께 검토한다.
