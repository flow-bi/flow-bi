# CONVENTIONS.md

## 1. 목적

이 문서는 `flow-bi` 저장소에서 사용하는 공통 명명, 코드, 문서, API, DB, Git 및 Agent 작업 규칙을 정의한다. 영역별 상세 규칙은 하위 문서에서 추가한다.

## 2. 공통 원칙

- 명확성을 짧음보다 우선한다.
- 하나의 이름은 하나의 개념만 나타내야 한다.
- 같은 개념에는 코드, API, DB, 문서에서 가능한 한 같은 용어를 사용한다.
- 숨은 동작보다 명시적인 입력, 출력과 의존성을 선호한다.
- 구현과 문서가 다르면 둘 중 하나를 방치하지 않고 같은 Task에서 정렬한다.
- 아직 정하지 않은 사항은 추측하지 않고 `TBD`와 결정 주체 또는 조건을 기록한다.

## 3. 공통 도메인 용어

다음 용어를 구분한다.

- **직원(User/Employee)**: 시스템을 사용하는 임직원
- **재직 상태(Employment Status)**: 재직, 휴직, 퇴사 등 인사 상태
- **업무 상태(Work Status)**: 업무 중, 휴가, 외근, 출장 등 현재 상태
- **직급(Position)**: 사원, 대리, 과장 등 인사 체계
- **역할(Role)**: 관리자, 일반 사용자 등 권한 묶음
- **권한(Permission)**: 특정 작업을 허용하는 최소 단위
- **일정 유형(Schedule Type)**: 개인, 팀, 프로젝트 등 일정의 성격
- **공개 범위(Visibility)**: 누가 일정 내용을 볼 수 있는지에 대한 정책
- **참석자(Participant)**: 일정에 실제로 참여하는 직원
- **공유 대상(Target)**: 일정이 노출되는 사용자·팀·프로젝트
- **회의실 예약(Room Reservation)**: 특정 회의실과 시간 구간을 점유하는 행위

용어 모델이 확정되지 않은 경우 관련 Product Spec 또는 Design Doc에서 먼저 정의한다.

## 4. 저장소 및 파일 규칙

- Markdown 파일명은 특별한 번호 체계를 제외하고 `kebab-case`를 사용한다.
- Java 타입 파일은 `PascalCase.java`를 사용한다.
- React 컴포넌트 파일명은 프로젝트의 프런트엔드 문서에서 하나의 방식을 정해 일관되게 사용한다.
- TypeScript의 일반 모듈은 `kebab-case.ts` 또는 `kebab-case.tsx`를 기본으로 한다.
- 테스트 파일은 대상 코드와 대응 관계가 드러나는 이름을 사용한다.
- Active Plan 파일은 `{feature-name}_{NN}.md` 형식을 사용한다. 기능명은 영문 `kebab-case`, 버전은 `01`부터 시작하는 2자리 숫자다.
- Active Plan의 Task ID는 `Task 01`부터 시작하는 2자리 번호를 사용한다.
- 새 최상위 디렉터리는 아키텍처 변경으로 간주하고 승인 없이 추가하지 않는다.
- 임시 산출물과 실행 기록을 제품 소스 디렉터리에 두지 않는다.

## 5. 코드 명명 규칙

### 5.1 공통

- 타입, 클래스, 인터페이스, React 컴포넌트: `PascalCase`
- 함수, 메서드, 변수: `camelCase`
- 상수: `UPPER_SNAKE_CASE`
- DB 테이블과 컬럼: `snake_case`
- URL 경로: 소문자 `kebab-case`
- Boolean은 `is`, `has`, `can`, `should` 등 참·거짓 의미가 드러나는 접두어를 사용한다.
- 약어를 임의로 만들지 않는다. 널리 쓰이는 `id`, `api`, `jwt` 등은 언어 관례에 맞춘다.

### 5.2 식별자

- API에서는 `{resource}Id`, Java/TypeScript에서는 `{resource}Id`, DB에서는 `{resource}_id`를 사용한다.
- 서로 다른 도메인의 ID를 같은 원시 값처럼 혼용하지 않는다.
- `role_id2`, `Field`처럼 의미가 불명확한 이름을 새 코드에 추가하지 않는다.

현재 ERD의 기존 명칭과 오탈자는 기준선 검토 단계에서 일괄 결정한다. 문서 초안 작성 중 임의로 원본을 변경하지 않는다.

## 6. TypeScript 및 React 규칙

- TypeScript의 엄격한 타입 검사를 활성화하는 방향을 기본으로 한다.
- `any`는 사용하지 않는 것을 원칙으로 하며 불가피하면 범위와 이유를 기록한다.
- 서버 응답 타입과 UI 표현 타입을 무조건 동일시하지 않는다.
- 서버 상태는 TanStack Query로 관리한다.
- 전역 클라이언트 상태는 Zustand로 관리하되 로컬 상태로 충분한 값을 전역화하지 않는다.
- 폼은 React Hook Form을 사용하고 Zod 스키마로 입력을 검증한다.
- 컴포넌트는 한 가지 주요 책임을 가지도록 분리한다.
- 권한에 따른 UI 숨김은 사용자 경험을 위한 것이며 서버 인가를 대체하지 않는다.
- 접근 가능한 HTML 구조, 키보드 조작, 명확한 레이블과 오류 메시지를 제공한다.

세부 디렉터리와 컴포넌트 규칙은 `frontend/FRONTEND.md`에서 정의한다.

## 7. Java 및 Spring Boot 규칙

- Java 17과 Spring Boot 3.5.7을 기준으로 한다.
- Build는 Gradle Groovy DSL을 사용한다.
- Java Formatting은 Spotless 7.0.4의 Eclipse Formatter를 사용한다.
- `check`는 `spotlessCheck`를 포함해야 한다.
- 사용하지 않는 Import를 제거하고, 후행 공백을 제거하며, 파일 끝 개행을 유지한다.
- 패키지는 소문자로 작성한다.
- 클래스는 역할이 드러나는 접미사를 사용하되 의미 없는 계층 복제를 피한다.
- 컨트롤러는 HTTP 요청 변환과 응답 조립에 집중한다.
- 애플리케이션 서비스는 유스케이스와 트랜잭션 경계를 조정한다.
- 핵심 비즈니스 규칙은 도메인 모델 또는 명시적인 도메인 서비스에 둔다.
- Repository 인터페이스와 영속성 구현의 책임을 구분한다.
- Entity를 API 요청·응답으로 직접 노출하지 않는다.
- 검증 실패와 비즈니스 오류를 일반적인 서버 오류와 구분한다.
- `Optional`은 반환 타입의 부재 표현에 제한적으로 사용하고 필드나 요청 DTO에 남용하지 않는다.
- 시간에는 `java.time` API를 사용한다.

세부 패키지와 의존 규칙은 `backend/BACKEND.md`에서 정의한다.

### 7.1 Pre-commit Formatting 설정

Repository를 Clone한 개발자는 최초 한 번 다음 명령을 실행해야 한다.

```bash
chmod +x scripts/pre-commit
git config core.hooksPath scripts
```

설정 확인:

```bash
git config --get core.hooksPath
```

정상 결과는 `scripts`다. Pre-commit Hook은 Commit 대상인 Staged Java 파일을 확인하고 Spotless Formatting을 적용한다.

예상 출력 형식:

```text
🧹 Auto-formatting code with Spotless...
📝 Checked staged files:
- src/main/java/com/flowbi/global/common/FormatTest.java
✅ Pre-commit checks complete!
```

Hook 동작을 검증할 때는 다음을 확인한다.

1. 사용하지 않는 Import와 의도적으로 깨진 들여쓰기가 있는 임시 Java 파일을 준비한다.
2. 파일을 Stage하고 팀 Commit 형식으로 Commit한다.
3. Hook 실행 결과에서 대상 파일과 완료 메시지를 확인한다.
4. 파일에서 미사용 Import가 제거되고 Formatting이 적용됐는지 확인한다.
5. `git diff --cached`로 실제 Commit 대상 내용을 다시 확인한다.
6. 검증 전용 파일은 제품 코드에 남기지 않는다.

검증 Commit 예시:

```text
✅ test / #42 - Pre-commit 포맷팅 동작 확인
```

Pre-commit Hook은 로컬 보조 장치다. Hook을 우회할 수 있으므로 Harness와 CI에서도 `spotlessCheck`를 실행해야 한다.

## 8. API 규칙

- API의 기본 미디어 타입은 JSON이다.
- 리소스명은 복수 명사를 기본으로 한다.
- HTTP 메서드의 의미를 지킨다.
- 상태 코드는 결과를 정확히 표현해야 한다.
- 요청 DTO와 응답 DTO를 분리할 수 있으며 Entity를 직접 노출하지 않는다.
- 날짜·시간은 ISO 8601 형식과 명확한 시간대 정보를 사용한다.
- 목록 조회는 결과 규모가 커질 수 있으면 페이지네이션 또는 기간 제한을 사용한다.
- 오류는 기계가 판별할 코드와 사용자가 이해할 메시지를 구분한다.
- 내부 예외 메시지를 그대로 반환하지 않는다.
- API 변경 시 `backend/API.md`를 함께 갱신한다.

API의 공통 응답 및 오류 형식은 `backend/API.md`에서 확정한다.

## 9. 데이터베이스 규칙

- PostgreSQL을 기준으로 설계한다.
- 테이블, 컬럼, 인덱스, 제약조건은 `snake_case`를 사용한다.
- PK와 FK의 타입은 참조 관계에서 일치해야 한다.
- `created_at`, `updated_at` 등 감사 필드의 의미를 일관되게 유지한다.
- 상태값은 허용값과 상태 전이를 문서화한다.
- 매핑 테이블에는 동일 관계의 중복을 막는 제약조건을 고려한다.
- 애플리케이션 검증만으로 데이터 무결성을 대체하지 않는다.
- 스키마 변경은 버전 관리되는 마이그레이션으로 수행한다.
- 마이그레이션과 `backend/DB_SCHEMA.md`는 같은 변경에서 갱신한다.
- 파괴적 마이그레이션은 백업·전환·복구 계획과 사람의 승인이 필요하다.

현재 ERD는 초기 기준선이다. PostgreSQL 타입 정합성, 오탈자, 관계 및 제약 개선은 전체 문서 작성 후 별도 검토한다.

## 10. 시간과 날짜 규칙

- 서비스 표시 기준 시간대는 `Asia/Seoul`이다.
- 저장과 전송 시에는 절대 시점과 시간대가 모호하지 않아야 한다.
- 시간 구간은 기본적으로 시작 포함, 종료 제외인 `[start, end)`로 다룬다.
- `endAt`은 `startAt`보다 뒤여야 한다.
- 종일 일정은 시간 일정과 구분하여 표현한다.
- 월간·주간·일간 조회의 경계와 주 시작 요일은 기능 명세에서 정의한다.

## 11. 오류 처리

- 예상 가능한 사용자 오류, 권한 오류, 충돌, 시스템 오류를 구분한다.
- 오류를 무시하거나 성공으로 변환하지 않는다.
- 사용자 메시지는 해결 가능한 정보를 제공하되 내부 구현을 노출하지 않는다.
- 로그에는 원인 분석에 필요한 문맥을 남기되 민감정보를 포함하지 않는다.
- 재시도 가능한 실패와 재시도하면 안 되는 실패를 구분한다.

## 12. 테스트 및 검증 규칙

테스트 도구가 확정되기 전에도 다음 원칙은 적용한다.

- 새 비즈니스 규칙에는 정상·경계·실패 시나리오가 있어야 한다.
- 버그 수정에는 가능하면 재현 테스트를 추가한다.
- 인증과 권한 기능은 비인가·미인증 시나리오를 검증한다.
- 시간, 동시성, 상태 전이가 있는 기능은 경계 조건을 검증한다.
- 외부 시스템은 테스트에서 통제 가능한 경계로 분리한다.
- 테스트를 통과시키기 위해 실제 검증을 제거하거나 완화하지 않는다.
- 실행하지 못한 검증은 이유와 위험을 보고한다.

구체적인 품질 게이트는 `docs/quality/quality-model.md`에서 정의한다.

## 13. 문서 작성 규칙

- 문서는 한국어를 기본으로 하고 코드 식별자와 표준 기술 용어는 영어를 사용할 수 있다. (todo: 영어로 변환?)
- 제목 구조를 일관되게 사용하고 하나의 문서 안에서 용어를 바꾸지 않는다.
- 규칙에는 가능한 경우 목적과 검증 방법을 함께 적는다.
- 요구사항 구현 문서에는 관련 FR/NFR ID를 기록한다.
- 확정된 결정과 제안, 검토 대기 항목을 명확히 구분한다.
- 날짜만으로 상태를 추정하지 않고 문서 상태를 명시한다.
- 코드와 계약이 바뀌면 관련 문서를 같은 Task에서 갱신한다.
- 중요한 기술 결정은 ADR로 남긴다.

## 14. Git 및 변경 관리

- 하나의 커밋은 하나의 논리적 변경을 담는다.
- 커밋 메시지는 변경 의도가 드러나게 작성한다.
- 생성 파일이나 포맷 변경으로 실제 변경을 가리지 않는다.
- 관련 없는 파일을 함께 수정하지 않는다.
- 비밀정보, 로컬 설정, 빌드 산출물을 커밋하지 않는다.
- 기존 변경을 임의로 되돌리지 않는다.
- 병합 충돌은 의미를 확인한 뒤 해결하며 한쪽을 무조건 선택하지 않는다.

### 14.1 Issue 및 Pull Request 제목

Issue와 Pull Request 제목은 다음 형식을 MUST 사용한다.

```text
[영향 범위]- {gitmoji} {type}: {작업 내용}
```

영향 범위는 다음 중 하나를 사용한다.

- `[ALL]-`: 프런트엔드와 백엔드를 포함하거나 저장소 전체에 영향을 주는 작업
- `[BE]-`: 백엔드에만 영향을 주는 작업
- `[FE]-`: 프런트엔드에만 영향을 주는 작업

예:

```text
[ALL]- 🎉 init: 프로젝트 초기 설정
[BE]- ✨ feat: 회의실 예약 API 추가
[FE]- 🐛 fix: 월간 캘린더 날짜 표시 오류 수정
```

영향 범위가 DB, Infra 또는 GitHub 설정에만 해당하더라도 현재 제목 접두사는 `[ALL]-`, `[BE]-`, `[FE]-` 중 가장 가까운 범위를 사용한다. 새로운 접두사는 팀 합의 후 이 문서에 추가한다.

### 14.2 Gitmoji 및 작업 Type

초기에는 다음 9개 Gitmoji와 Type만 사용한다. 새 항목은 필요할 때 팀 합의 후 추가한다.

| 상황 | 이모지 | 코드 | Type |
| --- | --- | --- | --- |
| 프로젝트 시작 | 🎉 | `:tada:` | `init` |
| 새 기능 추가 | ✨ | `:sparkles:` | `feat` |
| 버그 수정 | 🐛 | `:bug:` | `fix` |
| 리팩터링 | ♻️ | `:recycle:` | `refactor` |
| 설정·환경 작업 | 🔧 | `:wrench:` | `chore` |
| 문서 작업 | 📝 | `:memo:` | `docs` |
| 테스트 | ✅ | `:white_check_mark:` | `test` |
| CI 설정 | 👷 | `:construction_worker:` | `ci` |
| 배포 | 🚀 | `:rocket:` | `deploy` |

Issue·PR 템플릿에서 제공하는 Gitmoji를 우선 사용하며, Gitmoji와 Type은 표의 같은 행에 있는 조합을 사용한다.

### 14.3 Commit 메시지

Commit 메시지는 다음 형식을 MUST 사용한다.

```text
{gitmoji} {type} / #{issue-number} - {commit message}
```

예:

```text
🎉 init / #18938 - 프로젝트 초기 설정
✨ feat / #42 - 회의실 예약 API 추가
✅ test / #42 - 회의실 중복 예약 테스트 추가
```

- 모든 Commit은 관련 Issue 번호를 포함한다.
- 메시지는 해당 Commit에서 실제로 수행한 작업을 간결하게 작성한다.
- 하나의 Issue에서 기능과 테스트 Commit을 분리한 경우 각 Commit에 해당 Type을 사용한다.
- 관련 Issue가 없는 Commit을 먼저 만들지 않는다.

### 14.4 Branch

Issue를 먼저 생성한 뒤 다음 형식으로 Branch를 만든다.

```text
{scope}/{work-type}/#{issue-number}
```

허용하는 Scope:

- `fe`: 프런트엔드
- `be`: 백엔드
- `all`: 전체 또는 둘 이상의 영역

초기 Work Type:

- `feat`: 기능 개발
- `refactor`: 리팩터링
- `bug`: 버그 수정

예:

```text
fe/feat/#42
be/bug/#57
all/refactor/#81
```

Branch 운영 규칙:

- Issue 생성 없이 Branch를 만들지 않는다.
- Issue 하나당 Branch 하나를 사용한다.
- Branch 하나에서 서로 관련 없는 여러 Issue를 해결하지 않는다.
- 여러 하위 작업을 하나의 Branch에서 수행해야 하면 상위 Issue를 만들고 관련 Sub-issue를 연결한다.
- Branch의 작업 범위는 연결된 Issue와 Active Plan의 범위를 벗어나서는 안 된다.

### 14.5 Issue Label

Issue에는 작업 종류, 작업 영역, 우선순위와 필요한 상태 Label을 설정한다. 제목의 `[ALL]-`, `[BE]-`, `[FE]-` 접두사는 빠른 식별용이며 작업 영역 Label을 대체하지 않는다.

#### 작업 종류

| Label | 의미 |
| --- | --- |
| `✨ type: feature` | 새 기능 개발 |
| `🐛 type: bug` | 버그 수정 |
| `♻️ type: refactor` | 리팩터링 |
| `🧹 type: chore` | 설정, 잡일, 의존성, 템플릿 |
| `📝 type: docs` | 문서 작업 |
| `🎨 type: design` | UI, 스타일, 디자인 |
| `✅ type: test` | 테스트 코드 |
| `🚀 type: deploy` | 배포 관련 |

#### 작업 영역

| Label | 의미 |
| --- | --- |
| `💻 area: frontend` | 프런트엔드 |
| `☕ area: backend` | 백엔드 |
| `🗄️ area: database` | DB, ERD, 마이그레이션 |
| `⚙️ area: infra` | 인프라, CI/CD, Docker |
| `🐙 area: github` | Issue·PR 템플릿, Label, Milestone |

#### 우선순위

| Label | 의미 |
| --- | --- |
| `🔥 priority: high` | 높은 우선순위 |
| `🟡 priority: medium` | 보통 우선순위 |
| `🧊 priority: low` | 낮은 우선순위 |

#### 상태

| Label | 의미 |
| --- | --- |
| `🚧 status: in progress` | 진행 중 |
| `👀 status: review needed` | 리뷰 필요 |
| `⛔ status: blocked` | 진행이 막힘 |
| `🙋 status: help wanted` | 도움이 필요함 |

한 Issue에는 원칙적으로 작업 종류 Label 하나와 우선순위 Label 하나를 지정한다. 작업 영역 Label은 실제 영향 범위에 따라 하나 이상 사용할 수 있고, 상태 Label은 현재 상태에 맞게 갱신한다.

## 15. 주석과 TODO

- 코드 자체로 표현할 수 있는 내용을 반복 설명하는 주석은 피한다.
- 주석은 결정 이유, 제약 또는 비직관적인 동작을 설명한다.
- TODO에는 가능한 경우 관련 Plan, Issue 또는 요구사항 ID를 연결한다.
- 소유자나 해결 조건 없는 TODO를 장기 계획의 대체물로 사용하지 않는다.

## 16. 의존성 관리

- 새 의존성은 기존 기술로 해결할 수 없는 명확한 필요가 있을 때만 추가한다.
- 추가 전 유지보수 상태, 보안, 라이선스, 번들 또는 런타임 비용을 검토한다.
- 동일 목적의 라이브러리를 중복 도입하지 않는다.
- 버전 변경은 변경 내역과 호환성을 검증한다.
- 핵심 기술 스택 변경은 ADR과 사람의 승인이 필요하다.
