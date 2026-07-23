# Authentication and Permission Design Doc

이 문서는 인증, 세션, 권한 판단처럼 여러 기능에서 공통으로 참조하는 기술 설계 결정을 관리한다. 로그인 화면의 기능 요구사항은 `docs/product-specs/auth.md`, 관리자 기능 요구사항은 `docs/product-specs/admin.md`를 기준으로 한다.

## 적용 범위

- 로그인 이후 서비스 접근 전제
- 사용자 기본 정보와 인증 정보의 책임 분리
- 로그인 세션 및 토큰 관리 방향
- 관리자 기능 접근을 포함한 역할 기반 권한 판단

## 설계 결정

### 1. 인증된 사용자 맥락을 서비스 접근의 기본 전제로 둔다

#### 결정

그룹웨어의 주요 기능은 로그인한 사용자를 기준으로 동작한다. 사용자별 일정, 헤더 표시 이름, 마이페이지, 관리자 접근, 알림 정책은 인증된 사용자 맥락을 기준으로 판단한다.

#### 근거

- `requirements.md` NFR-001은 로그인 사용자만 서비스 이용 가능해야 한다고 정의한다.
- `core-beliefs.md`는 서비스 기능을 로그인한 사용자 기준으로 판단한다고 정의한다.
- `database.md`의 일정 등록자, 사용자 역할, 토큰, 소속 팀 정보는 사용자와 연결되어 있다.

#### 영향

개별 기능은 익명 사용자 흐름을 기본 전제로 두지 않는다. 인증이 필요한 화면과 데이터 조회는 사용자 식별 정보를 기준으로 접근 범위를 판단한다.

### 2. 사용자 기본 정보와 인증 정보는 분리한다

#### 결정

임직원 기본 정보와 비밀번호 해시, 토큰 같은 인증 정보는 같은 책임으로 다루지 않는다. 사용자 기본 정보는 조직도, 마이페이지, 관리 기능에서 사용하고, 인증 정보는 로그인과 세션 유지에 한정해 다룬다.

#### 근거

- `database.md`는 `users`를 임직원 핵심 정보 관리 테이블로 정의한다.
- `database.md`는 `user_credentials`를 비밀번호 해시 값을 인사 정보와 격리하기 위한 테이블로 설명한다.
- `requirements.md` NFR-002는 비밀번호를 암호화하여 저장해야 한다고 정의한다.
- `core-beliefs.md`는 민감 정보와 권한 판단을 일반 정보와 분리한다고 정의한다.

#### 영향

조직도, 직원 목록, 마이페이지 같은 사용자 정보 조회 기능은 인증 민감 정보를 함께 노출하지 않는다. 인증 기능 변경 시에도 사용자 기본 정보 기능의 책임과 분리해 검토한다.

### 3. 로그인 계정은 사용자와 1:1로 연결한다

#### 결정

한 명의 임직원은 시스템 내에서 하나의 고유한 인증 정보 세트를 가진다.

#### 근거

- `database.md`는 `users`와 `user_credentials`의 관계를 1:1로 설명한다.
- `database.md`는 `user_credentials.user_id`에 Unique 제약조건을 두어 한 사용자에게 하나의 인증 정보 세트만 연결되도록 설명한다.

#### 영향

인증 정보는 사용자 단위로 식별된다. 하나의 임직원에게 여러 자체 로그인 계정을 부여하는 흐름은 현재 확정된 설계 범위에 포함하지 않는다.

### 4. 로그인 세션은 여러 기기 사용을 고려해 관리한다

#### 결정

한 사용자는 여러 기기나 브라우저에서 로그인할 수 있는 세션 기록을 가질 수 있다.

#### 근거

- `database.md`는 `users`와 `user_tokens`를 1:N 관계로 설명한다.
- `database.md`는 PC, 태블릿, 스마트폰 등 여러 환경에서 각각 독립된 Refresh Token이 발급될 수 있어야 한다고 설명한다.
- `architecture.md`는 Authentication 기술로 JWT를 선택한다.

#### 영향

로그아웃, 토큰 만료, 기기별 세션 관리는 사용자 단일 세션만을 전제로 설계하지 않는다. 단, 구체적인 기기 관리 화면이나 모든 기기 로그아웃 기능은 현재 Product Spec에 확정되어 있지 않다.

### 5. 권한은 사용자 직접 권한이 아니라 역할 기반으로 판단한다

#### 결정

기능 접근 여부는 사용자에게 직접 세부 권한을 부여하는 방식이 아니라 역할을 통해 판단한다. 역할은 여러 권한을 가질 수 있고, 사용자는 여러 역할을 가질 수 있다.

#### 근거

- `database.md`의 RBAC 도메인은 사용자에서 역할, 역할에서 세부 권한으로 이어지는 구조를 정의한다.
- `database.md`는 `user_roles`, `role_permissions`를 다대다 관계 해소를 위한 매핑 구조로 설명한다.
- `core-beliefs.md`는 기능 접근 여부를 역할 기반 권한 구조로 판단한다고 정의한다.

#### 영향

관리자 탭 접근이나 특정 기능 제어는 사용자 이름, 직급, 팀만으로 판단하지 않는다. 권한이 필요한 기능은 역할과 권한 구조를 기준으로 접근 가능 여부를 확인한다.

## Product Spec 연결

- `docs/product-specs/auth.md`: 로그인, 로그아웃, 비밀번호 변경 진입, 인증 사용자 접근 제한
- `docs/product-specs/admin.md`: 관리자용 탭, 직원관리, 팀관리
- `docs/product-specs/my-page.md`: 본인 정보 조회 및 수정, 알림 설정
- `docs/product-specs/organization-chart.md`: 직원 기본 정보 조회
- `docs/product-specs/calendar.md`: 등록자 기준 일정 수정/삭제, 사용자별 일정 조회

## 미확정 사항

- 자체 로그인 외 인증 제공자 사용 여부는 확정되어 있지 않다.
- 비밀번호 변경의 상세 절차와 화면 범위는 확정되어 있지 않다.
- 관리자 역할의 세부 권한 목록은 확정되어 있지 않다.
- 기기별 세션 관리 화면이나 모든 기기 로그아웃 기능은 확정되어 있지 않다.

## Reference Mapping

- `docs/references/requirements.md`: FR-009, FR-010, NFR-001, NFR-002
- `docs/references/ui-ux-spec.md`: 1-1 로그인, 1-7 관리
- `docs/references/architecture.md`: Authentication JWT
- `docs/references/database.md`: `users`, `user_credentials`, `user_tokens`, `roles`, `permissions`, `user_roles`, `role_permissions`
- `docs/design-docs/core-beliefs.md`: 인증된 사용자 맥락, 민감 정보와 권한 판단 분리
