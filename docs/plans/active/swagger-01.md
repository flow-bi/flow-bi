# 작업 계획: swagger-01

## 1. 기본 정보

### 사용자 요청

Spring Boot 백엔드에 Swagger UI와 OpenAPI 문서 자동 생성 기반을 도입하고 Harness에서 정상 동작을 검증한다.

### 작업 목적

Spring Boot 3.5.7 및 Spring MVC 기준으로 `springdoc-openapi` 2.8.x를 도입하여 이후 Controller 구현이 기계 판독 가능한 OpenAPI 계약으로 생성되게 한다. API 문서 endpoint는 개발·Harness 프로필에서만 활성화하고 기본 프로필에서는 비활성화하여 불필요한 운영 노출을 막으며, 생성되는 OpenAPI JSON과 Swagger UI 진입 경로를 자동화된 테스트로 검증한다.

### 작업 유형

- feature

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `backend/BACKEND.md`, `backend/API.md`, `backend/AGENTS.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. springdoc 기반 및 프로필별 OpenAPI 노출 구현

#### 선행 Task

- 없음

#### 작업 목적

Spring MVC 애플리케이션에 버전이 고정된 springdoc starter와 공통 OpenAPI metadata를 추가하고, `local`·`harness` 프로필에서는 OpenAPI JSON과 Swagger UI를 제공하되 기본 프로필에서는 모두 비활성화한다.

#### 수정 가능 경로

- `backend/build.gradle`
- `backend/src/main/resources`
- `backend/src/main/java/com/flowbi`
- `backend/src/test/java/com/flowbi`
- `backend/BACKEND.md`
- `backend/API.md`

#### 수정 금지 경로

- `frontend`
- `backend/src/main/java/com/flowbi/domain`
- `backend/src/test/java/com/flowbi/domain`
- `backend/DB_SCHEMA.md`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`
- `.agents`

#### 구현 항목

- [ ] Red 단계에서 `harness` 프로필의 `/v3/api-docs`·Swagger UI 진입 경로 활성화, 기본 프로필의 문서 endpoint 비활성화, OpenAPI metadata를 검증하는 실패 테스트를 먼저 작성하고 설정 부재 또는 계약 불일치로 실패하는지 확인한다.
- [ ] `backend/build.gradle`의 기존 미검증 `springdoc-openapi-starter-webmvc-ui:2.8.17` 변경을 Spring Boot 3.5.7 호환 WebMVC starter로 유지하되 정확한 버전을 고정하고 기존 Gradle 의존성 형식에 맞게 정리한다. 별도의 중복 Swagger annotation 의존성은 추가하지 않는다.
- [ ] 기본 `application.yml`에서 `springdoc.api-docs.enabled`와 `springdoc.swagger-ui.enabled`를 명시적으로 `false`로 설정해 기본·운영 실행이 실패 폐쇄되게 한다.
- [ ] `application-local.yml`과 `application-harness.yml`에서 OpenAPI JSON `/v3/api-docs`와 Swagger UI `/swagger-ui.html`을 명시적으로 활성화한다.
- [ ] `com.flowbi.global.config`에 도메인 규칙을 포함하지 않는 공통 OpenAPI 설정을 추가하고 제목은 `Flow BI API`, 버전은 현재 애플리케이션 빌드 버전을 사용한다. 미확정 API versioning을 의미하는 `/api/v1` 또는 Bearer JWT 보안 scheme은 선언하지 않는다.
- [ ] Harness 프로필의 `/v3/api-docs` 응답이 `200 OK`, 유효한 JSON, OpenAPI 버전, `Flow BI API` metadata를 포함하는지 검증하고 현재 존재하는 Controller path의 구체 목록에는 의존하지 않는다.
- [ ] Swagger UI 진입 경로가 Harness 프로필에서 UI resource로 연결되는지 MockMvc smoke test로 확인하고, 기본 프로필에서는 `/v3/api-docs`와 Swagger UI 진입 경로가 모두 성공 응답을 반환하지 않는지 검증한다.
- [ ] `backend/BACKEND.md`의 OpenAPI 문서화 방식 TBD와 `backend/API.md`의 OpenAPI 자동화 도구 TBD를 실제 springdoc 버전·프로필·경로·검증 정책으로 갱신하되 API base path, 성공 Envelope, Session Cookie 및 CSRF 정책은 미확정 상태를 유지한다.
- [ ] Green 이후 설정·metadata·테스트의 중복을 정리하고 Task 범위 테스트를 다시 통과시킨다.

#### 검증 항목

- [ ] Red 단계에서 새 OpenAPI 기반 테스트가 profile 설정 또는 metadata 부재로 실패하며 Controller 비즈니스 로직 실패 때문이 아님을 실행 기록에 남긴다.
- [ ] `cd backend && ./gradlew test --tests 'com.flowbi.global.config.OpenApiInfrastructureTest' --tests 'com.flowbi.global.config.OpenApiDisabledByDefaultTest'`로 Harness 활성화·기본 비활성화·metadata·Swagger UI smoke 계약을 검증한다.
- [ ] `cd backend && ./gradlew dependencies --configuration runtimeClasspath` 대신 허용된 Backend 검증 경로의 `compileJava` 또는 `build` 결과로 springdoc 2.8.17 의존성 해석과 Spring Boot 기동 호환성을 확인한다.
- [ ] `cd backend && ./gradlew spotlessCheck`로 OpenAPI 설정 및 테스트 Java 형식을 검증한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- 기본 프로필에서 OpenAPI JSON과 Swagger UI가 활성화되지 않아야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트, 정적 검증 또는 빌드 실패
- springdoc 버전을 `latest` 또는 동적 범위로 지정함
- Spring Boot 4 전용 springdoc 3.x 또는 WebFlux starter를 도입함
- 기본 프로필에서 `/v3/api-docs` 또는 Swagger UI가 성공적으로 노출됨
- JWT, Session Cookie, CSRF 또는 API versioning 미확정 정책을 임의로 확정함
- 현재 작업 중인 회의실 Controller·DTO·테스트를 수정하거나 되돌림
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 `90` 미만

#### 제외 범위

- 회의실 또는 다른 도메인의 Controller 작성·수정·삭제
- Controller별 `@Tag`, `@Operation`, `@Parameter`, `@Schema` 추가
- endpoint별 Request·Response·오류 schema 계약 검증
- Spring Security·Spring Session·CSRF 구현 또는 인증 정책 변경
- 운영 환경 Swagger 공개와 접근 허용 정책
- OpenAPI 기반 프런트엔드 Client 자동 생성
- Swagger UI의 Cypress 브라우저 E2E 검증

#### 작업 결과

`none`

#### 남은 문제

- Controller 구현 후 각 path, method, request, response, 오류 schema와 민감정보 비노출을 검증하는 OpenAPI 계약 테스트가 후속 Task로 필요하다.
- 실제 Spring Security가 활성화될 때 문서 endpoint 접근 정책과 Swagger UI의 Session Cookie·CSRF 시험 방식은 별도 승인이 필요하다.
- Swagger UI는 제품 사용자 화면이 아닌 개발 도구이므로 이번 Task는 MockMvc smoke test까지만 수행하고 브라우저 E2E는 포함하지 않는다.

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- Task 간 결과가 정상적으로 통합되어야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 관련 문서와 실제 구현이 일치해야 한다.
- springdoc 2.8.17이 Spring Boot 3.5.7 WebMVC 애플리케이션에서 정상 해석·기동되어야 한다.
- `local`·`harness` 프로필에서 OpenAPI JSON과 Swagger UI 진입 경로가 활성화되고 기본 프로필에서는 비활성화되어야 한다.
- TDD `Red → Green → Refactor` 실행 증거가 Task 결과에 기록되어야 한다.
- 모든 Task 완료 후 Harness 실행기가 `cd backend && ./gradlew spotlessCheck`, `cd backend && ./gradlew test`, `cd backend && ./gradlew build`를 실행해 통과해야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Architecture, Product Spec, Design Doc 또는 보안 기준과 충돌함
- 기본 프로필에서 Swagger 또는 OpenAPI 문서가 노출됨
- 기존 회의실 Controller 작업 변경을 덮어쓰거나 되돌림
- 구현과 `backend/BACKEND.md` 또는 `backend/API.md`가 동기화되지 않음
- 테스트 삭제, 단언 약화 또는 검증 우회로 작업을 통과시킴
- 전체 `quality_score`가 `90` 미만
- 남은 문제가 사용자 확인 없이 방치됨
