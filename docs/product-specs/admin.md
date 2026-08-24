# 관리자 Product Spec

## 기능 목적

고정된 전역 RBAC를 바탕으로 직원·팀·관리자 역할을 안전하게 관리하고, 시스템 운영 권한과 인사 운영 권한을 분리한다.

## 역할 및 권한 계약

역할과 권한은 Migration으로 관리하는 고정 기준 데이터다. 런타임에서 역할이나 권한 종류를 생성·수정·삭제하지 않으며, 조직별 범위를 갖는 역할도 현재 범위에 포함하지 않는다.

한 사용자는 여러 역할을 가질 수 있고 최종 권한은 모든 역할에 명시적으로 연결된 권한의 합집합이다. 역할 간 상속이나 `ADMIN` 우회 규칙은 없으며, 백엔드는 모든 요청에서 필요한 권한을 확인하고 권한이 없으면 기본 거부한다.

| 역할 코드 | 표시 이름 | 명시적으로 연결하는 권한 |
| --- | --- | --- |
| `ADMIN` | 총 관리자 | 아래 8개 권한 전부 |
| `SYSTEM_ADMIN` | 시스템 관리자 | `SYSTEM_MONITOR`, `ACCOUNT_STATUS_READ`, `THEME_MANAGE`, `ROOM_RESOURCE_MANAGE` |
| `HR_ADMIN` | 인사 관리자 | `USER_MANAGE`, `TEAM_MANAGE` |

| 권한 코드 | 허용 범위 |
| --- | --- |
| `SYSTEM_MONITOR` | 서비스 상태, 시스템 로그, 오류 상태 조회 |
| `ACCOUNT_STATUS_READ` | 사번과 계정·재직 상태의 최소 정보 조회 |
| `THEME_MANAGE` | 회사 대표 테마 조회·변경 |
| `ROOM_RESOURCE_MANAGE` | 회의실 사진과 장비 종류·연결 정보 관리 |
| `USER_MANAGE` | 일반 직원 등록·조회·수정, 계정 상태 변경, 비밀번호 초기화, 퇴직 처리 |
| `TEAM_MANAGE` | 팀 생성·조회·수정·비활성화·재활성화 |
| `ROLE_MANAGE` | 고정 역할 목록 조회와 사용자 역할 부여·회수 |
| `PRIVILEGED_ACCOUNT_MANAGE` | 하나 이상의 관리자 역할을 가진 사용자의 계정·인사 정보 변경 |

`SYSTEM_ADMIN`과 `HR_ADMIN`을 동시에 가진 사용자도 `ROLE_MANAGE`와 `PRIVILEGED_ACCOUNT_MANAGE`가 없으므로 `ADMIN`과 같지 않다.

## 대상 사용자 보호 계약

- 관리자 역할이 없는 직원은 `USER_MANAGE`만으로 관리할 수 있다.
- `ADMIN`, `SYSTEM_ADMIN`, `HR_ADMIN` 중 하나라도 가진 사용자의 일반 정보, 계정 상태, 재직 상태 또는 비밀번호를 관리하려면 `USER_MANAGE`와 `PRIVILEGED_ACCOUNT_MANAGE`를 모두 요구한다. 현재 매핑에서는 `ADMIN`만 가능하다.
- 역할 조회·부여·회수에는 `ROLE_MANAGE`가 필요하며 현재 `ADMIN`만 수행할 수 있다.
- 역할은 `ACTIVE`이면서 `EMPLOYED`인 사용자에게만 부여할 수 있다.
- 동일 역할을 다시 부여하거나 보유하지 않은 역할을 회수하는 요청은 멱등 성공으로 처리한다.
- `ACTIVE + EMPLOYED + ADMIN` 조건을 만족하는 마지막 사용자의 `ADMIN` 역할 회수, 계정 비활성화 또는 퇴직 처리는 `409 LAST_ADMIN_REQUIRED`로 거부한다.
- 본인의 역할 또는 상태 변경도 같은 대상 보호 규칙을 적용한다. 관리자가 본인 비밀번호를 바꾸는 경우 관리자 초기화가 아니라 일반 비밀번호 변경 흐름을 사용한다.
- 역할 부여·회수에 성공하면 대상 사용자의 모든 세션을 무효화한다.
- 역할 부여·회수 시각, 행위자, 이전 상태를 DB나 보안 로그에 별도 기록하지 않는다. 로그인, 비밀번호 초기화, 직원 상태 변경 등 역할 변경 외 보안 이벤트 기록은 유지한다.

## 직원 관리 계약

### 상태 모델

- 계정 상태는 `ACTIVE`, `INACTIVE`, 재직 상태는 `EMPLOYED`, `TERMINATED`만 사용한다.
- 신규 직원은 `ACTIVE + EMPLOYED`로 생성한다.
- `INACTIVE`는 로그인을 막는 가역 상태다. 재활성화할 때 새 임시 비밀번호를 발급하고 `mustChangePassword=true`로 설정한다.
- 퇴직 처리는 한 트랜잭션에서 `TERMINATED + INACTIVE`로 변경하고 모든 세션을 무효화한다.
- `TERMINATED`는 되돌리지 않는다. 재입사자는 새 사번과 새 사용자 레코드로 등록한다.
- 연차, 휴가, 장기 휴직 같은 근태 상태는 이 모델에 포함하지 않는다.

### 직원 기능별 케이스

| 케이스 | 필요한 권한 | 결과 |
| --- | --- | --- |
| 일반 직원 등록·조회·수정 | `USER_MANAGE` | 직원 및 인증정보 계약에 따라 처리 |
| 일반 직원 계정 비활성화·재활성화 | `USER_MANAGE` | 상태 변경, 관련 세션 무효화, 재활성화 시 임시 비밀번호 일회 반환 |
| 일반 직원 퇴직 | `USER_MANAGE` | `TERMINATED + INACTIVE`, 모든 세션 무효화 |
| 관리자 역할 보유자 관리 | `USER_MANAGE` + `PRIVILEGED_ACCOUNT_MANAGE` | `ADMIN`만 가능하며 마지막 총 관리자 보호 적용 |
| 시스템 관리자의 계정 상태 조회 | `ACCOUNT_STATUS_READ` | 사번, 계정 상태, 재직 상태만 반환하며 변경 불가 |
| 관리자 비밀번호 초기화 | 위 대상별 사용자 관리 권한 | 서버가 임시 비밀번호를 생성해 성공 응답에서 한 번만 반환 |

## 팀 관리 계약

- 팀 상태는 `ACTIVE`, `INACTIVE`만 사용하며 팀을 물리 삭제하지 않는다.
- 팀 비활성화는 활성 사용자가 없고 활성 하위 팀이 없을 때만 허용한다. 그렇지 않으면 `409 TEAM_IN_USE`로 거부한다.
- 비활성 팀은 일반 조직도, 기본 배정 후보, 직원 이동 대상과 하위 팀 생성의 상위 팀 후보에서 제외한다.
- 팀 재활성화는 상위 팀이 없거나 상위 팀이 `ACTIVE`일 때만 허용한다.
- 팀을 재활성화해도 하위 팀이나 소속 사용자를 자동으로 재활성화하지 않는다.
- 비활성 팀과 Closure 경로는 이력과 계층 무결성을 위해 보존한다.

## 임시 비밀번호 계약

- 직원 등록, 관리자 비밀번호 초기화, 계정 재활성화 시 서버가 CSPRNG로 20자 임시 비밀번호를 생성한다.
- 임시 비밀번호는 영문 대문자·소문자·숫자·특수문자를 각각 하나 이상 포함한다.
- 평문은 저장하거나 로그에 남기지 않고 BCrypt 해시만 저장한다.
- 평문 임시 비밀번호는 성공 응답에서 한 번만 반환하고 응답에 `Cache-Control: no-store`를 적용한다.
- 응답을 잃어버린 경우 복구하지 않고 다시 초기화한다. 임시 비밀번호 발급 시 항상 `mustChangePassword=true`로 설정하고 대상 세션을 무효화한다.

## 역할 관리 API 계약

- `GET /api/users/{userId}/roles`: 대상 사용자의 현재 고정 역할 목록 조회
- `POST /api/users/{userId}/roles/{roleCode}`: 역할 하나 부여
- `DELETE /api/users/{userId}/roles/{roleCode}`: 역할 하나 회수

역할 변경 이력 API는 제공하지 않는다. 알 수 없는 역할 코드, 비활성·퇴직 사용자 대상, 마지막 총 관리자 보호 위반은 안정적인 오류 코드로 거부한다.

## 최초 총 관리자 Bootstrap

- 향후 승인된 Migration은 고정 역할·권한·매핑과 최초 `ADMIN` 직원 계정을 함께 생성한다.
- 사번, 이름, 이메일, 기존 `teamId`, 기존 `positionId`, BCrypt 비밀번호 해시는 배포 환경 설정으로 주입하며 Git 또는 Markdown에 실제 값을 기록하지 않는다.
- 필수 값 누락, 사번·이메일 중복, 존재하지 않는 참조, 비활성 팀 참조가 있으면 Migration은 실패해야 한다.
- Bootstrap을 위해 가짜 관리자 팀이나 직급을 만들지 않는다.
- 최초 계정은 `ACTIVE + EMPLOYED`, `mustChangePassword=true`, `ADMIN` 역할로 생성한다.
- 이후 긴급 복구는 승인된 운영 Runbook을 통해 수행한다.

## 화면 및 데이터 흐름

- 관리 메뉴와 작업 버튼은 보유 권한에 따라 노출하되, UI 제어를 보안 경계로 사용하지 않는다.
- 직원 관리 화면은 직원 목록, 등록, 수정, 계정·재직 상태 변경, 비밀번호 초기화를 제공한다.
- 팀 관리 화면은 팀 목록, 생성, 수정, 비활성화, 재활성화를 제공한다.
- 역할 관리 화면은 현재 역할을 표시하고 `ADMIN`에게만 고정 역할의 개별 부여·회수를 제공한다.
- 직원과 팀의 상태 변경은 각각 별도의 `PATCH` API를 사용하며 `DELETE` API로 표현하지 않는다.

## 제외한 요구사항

- 역할·권한 카탈로그의 동적 CRUD
- 조직 범위 역할과 역할 계층·암묵적 권한 상속
- 직원과 팀의 물리 삭제
- 퇴직 취소와 기존 사용자 레코드를 이용한 재입사
- 역할 부여·회수 이력, 행위자, 발생 시각 저장 또는 조회
- 시스템 로그·상태 화면과 테마·회의실 자원 관리의 상세 동작은 `system-admin.md`에서 정의한다.

## 인수 조건

- 세 역할의 권한이 표와 정확히 일치하고 `ADMIN`도 우회 없이 8개 권한을 명시적으로 가진다.
- 관리자 역할 보유자 변경과 마지막 총 관리자 보호 규칙이 모든 관련 API에서 동일하게 적용된다.
- 역할 변경, 계정 비활성화, 퇴직, 비밀번호 초기화 후 대상의 기존 세션을 사용할 수 없다.
- 직원·팀은 물리 삭제되지 않으며 확정된 상태 전이와 충돌 오류를 따른다.
- 역할 변경 이력을 저장하는 컬럼, 테이블, 로그 또는 조회 API가 없다.

## Scope Decision

- In Scope: 고정 전역 RBAC, 역할 부여·회수, 직원과 팀 관리, 임시 비밀번호, 최초 총 관리자 Bootstrap 계약.
- Out of Scope: 동적 RBAC, 조직 범위 역할, 물리 삭제, 역할 변경 이력, 시스템 운영 화면 구현.
- Moved: 로그인과 일반 비밀번호 변경은 `auth.md`와 `my-page.md`, 시스템 관리자 기능은 `system-admin.md`로 이동한다.

## Reference Mapping

- `docs/references/requirements.md`: FR-001~FR-008
- `docs/references/ui-ux-spec.md`: 1-7 관리자
- `docs/references/database.md`: `users`, `teams`, `teams_closure`, `positions`, `roles`, `permissions`, `role_permissions`, `user_roles`
- `docs/design-docs/authentication-and-permission.md`: 인증·인가와 세션 무효화 설계
- `backend/DB_SCHEMA.md`: 구현 전 Target Contract

## 미확정 사항

- 없음. 이 문서의 범위를 확장하는 기능은 별도 Product Spec과 승인 절차에서 결정한다.

## 관련 Product Spec

- `auth.md`
- `system-admin.md`
- `global-layout.md`
- `meeting-room.md`
- `organization-chart.md`
- `my-page.md`
