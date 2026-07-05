# FRONTEND.md

이 문서는 프론트엔드 코드를 작성할 때 따르는 구조와 컨벤션을 정의한다. `ARCHITECTURE.md`의 feature 기반 폴더 구조를 실제 파일 단위로 구체화하고, 상태 관리·API 통신·폼 처리 방식을 도메인 전체에 일관되게 적용하기 위한 규칙을 담는다.

---

## 1. 폴더 구조

```
frontend/src/
├── app/                    # 라우팅, 전역 Provider, 인증 가드
│   ├── routes/
│   └── providers/
├── features/
│   ├── auth/
│   ├── user/
│   │   ├── mypage/
│   │   └── org-chart/
│   ├── schedule/
│   │   ├── calendar/
│   │   └── dashboard-widgets/
│   ├── meetingroom/
│   ├── theme/
│   └── admin/
└── shared/
    ├── api/                # apiFetch, 공통 axios/fetch 인스턴스
    ├── components/         # Modal, SidePanel, StatusBadge 등 DESIGN.md 컴포넌트 패턴 구현체
    ├── hooks/
    └── types/              # springdoc-openapi에서 생성된 공통 타입
```

## 2. feature 폴더 내부 구조 (모든 feature 공통)

```
features/{domain}/{sub-feature}/
├── api.ts          # 이 feature가 호출하는 API 함수들 (apiFetch 래핑)
├── hooks.ts         # useQuery/useMutation 커스텀 훅
├── components/       # 이 feature 전용 컴포넌트
├── types.ts          # 이 feature 전용 타입 (springdoc 생성 타입을 재조합/가공)
└── mock/             # (admin처럼 "디자인만" feature에 한해) 목업 데이터
```

- `api.ts`에서만 `shared/api`의 `apiFetch`를 호출한다. 컴포넌트가 직접 `fetch`나 axios를 호출하지 않는다.
- `mock/` 폴더는 `admin.md`처럼 명시적으로 "디자인만"으로 확정된 feature에만 존재한다(AGENTS.md 4번 규칙). 실기능 feature에 목업이 섞이지 않게 한다.

## 3. 상태 관리 원칙 (셋 중 어디에 둘지 판단 기준)

| 상태 종류 | 도구 | 예시 |
|---|---|---|
| 백엔드에서 온 데이터 | TanStack Query | 일정 목록, 회의실 현황, 조직도 |
| 여러 컴포넌트/라우트가 공유하는 클라이언트 전용 상태 | Zustand | 로그인 여부, 선택된 테마 |
| 컴포넌트 하나에 국한된 상태 | `useState` | 모달 열림/닫힘, 입력 중인 검색어(제출 전) |
| 폼 입력/검증 상태 | React Hook Form | 일정 추가 폼, 마이페이지 수정 폼 |

새 상태를 추가할 때 이 표에서 기본적으로 어디 속하는지 먼저 판단하고, 애매하면 가장 좁은 범위(useState)부터 시작해서 실제로 공유가 필요해질 때 Zustand로 옮긴다(`design-docs/core-beliefs.md` 7번 "필요성이 실측되기 전까지 들이지 않는다" 원칙과 동일한 정신).

세부 사용 패턴(`create<State>()`, `useQuery`/`useMutation`, `zodResolver`)은 `references/frontend-stack-llms.txt` 참고.

## 4. API 통신 규칙

- 모든 API 호출은 `shared/api/client.ts`의 `apiFetch`를 통과한다. Envelope 언랩, 401 시 refresh 시도, 에러 메시지 추출을 여기서 한 번만 구현한다.
- 요청/응답 타입은 손으로 작성하지 않는다. springdoc-openapi가 생성한 OpenAPI 스펙을 `openapi-typescript`로 변환해 `shared/types/`에 생성하고, 각 feature의 `types.ts`는 이 생성 타입을 조합/가공만 한다(`references/springdoc-openapi-llms.txt` "프론트엔드 타입 동기화" 참고).
- API 응답 필드가 snake_case로 오면(API설계 문서 기준), `apiFetch` 경계에서 camelCase로 변환한다. feature 코드 내부에서는 항상 camelCase만 다룬다.

## 5. 폼 처리 규칙

React Hook Form + Zod를 모든 입력 폼에 일관되게 사용한다(마이페이지 수정, 일정 추가/수정, 회의실 예약 등). 컴포넌트 안에서 직접 `useState`로 입력값을 관리하는 방식은 지양한다 — 검증 로직이 컴포넌트마다 흩어지는 것을 막기 위함이다.

- Zod 스키마는 해당 feature의 `types.ts` 옆에 `schema.ts`로 분리한다.
- 백엔드 enum 값(예: `users.status`, `schedules.schedule_type`)이 바뀌면 대응하는 Zod `z.enum([...])`도 같은 커밋에서 함께 갱신한다.

## 6. 라우팅 및 인증 가드

- `app/routes/`에 라우트를 정의하고, 로그인이 필요한 라우트는 공통 가드 컴포넌트로 감싼다.
- 가드는 `auth` feature의 Zustand 스토어(`isAuthenticated`)를 구독해서, 미인증 시 로그인 페이지로 리다이렉트한다.
- 라우트-도메인 매핑은 `product-specs/index.md`의 화면 목록과 1:1로 대응시킨다(임의로 라우트를 추가하지 않는다).

## 7. 공통 컴포넌트 (`shared/components/`)

`DESIGN.md` 4번(레이아웃 패턴), 5번(상태 배지)에서 정의한 반복 패턴은 반드시 여기에 구현하고 재사용한다. 화면마다 새로 만들지 않는다.

| 컴포넌트 | 대응 DESIGN.md 패턴 | 사용처 |
|---|---|---|
| `SidePanel` | 우측 배너 | 캘린더 날짜별 일정, 회의실 예약 입력 |
| `Modal` | 모달 | 일정 상세/추가, 로그인 비밀번호 변경(확정 시) |
| `StatusBadge` | 상태 배지 | 마이페이지/조직도(`users.status`), 회의실(`rooms_reservations.status`) |
| `TimeGrid` | 시간대 그리드 | 회의실 현황판 전용 |

## 8. 네이밍 컨벤션

- 컴포넌트 파일/함수: PascalCase (`ScheduleCalendar.tsx`)
- 커스텀 훅: `use` 접두사 + camelCase (`useScheduleList.ts`)
- API 함수: 동사+명사 camelCase (`fetchSchedules`, `createSchedule`)
- Zod 스키마: `{도메인}Schema` (`profileSchema`)

## 9. 로딩/에러 상태 UI

- TanStack Query의 `isPending`/`isError` 상태에 따라 각 feature 컴포넌트는 최소 스켈레톤(또는 스피너)과 에러 메시지 UI를 구현한다. 빈 로딩/에러 처리 없이 데이터를 그대로 렌더링하지 않는다.
- 전역 에러 바운더리를 `app/providers/`에 하나 두어, 처리되지 않은 렌더링 에러가 화면 전체를 하얗게 만들지 않도록 한다.
- 에러 메시지 문구는 `DESIGN.md` 6번(라이팅 톤) 규칙을 따른다.

## 10. 접근성 체크리스트 (구현 시 적용, DESIGN.md 7번과 연결)

- 모든 `SidePanel`/`Modal`은 열렸을 때 포커스를 이동시키고, `Esc`로 닫을 수 있어야 한다.
- 폼 필드의 에러 메시지는 `aria-describedby`로 입력 필드와 연결한다.
- 색상만으로 상태를 구분하지 않는다 (`StatusBadge`는 항상 텍스트 라벨 포함, 이미 DESIGN.md에서 확정).

## 11. 남은 미정 사항

- 테스트 프레임워크/전략은 아직 확정되지 않았다(`exec-plans/tech-debt-tracker.md` 참고). 확정되면 이 문서에 테스트 파일 위치 컨벤션(예: `*.test.tsx` 위치)을 추가한다.
- `openapi-typescript` 자동 생성 스크립트의 실행 시점(로컬 수동 vs CI)은 `frontend-mvp1.md` 실행 계획에서 결정한다.