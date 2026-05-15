## Context

TaskFlow MVP 배포 완료 후, 스토리보드 v2에서 정의한 기능 중 3가지가 미구현 상태다:

1. **태스크 assignee/created_at 누락** — Task 모델에 `assignee_id`(nullable), `created_at` 컬럼이 없어 `@me`·`미할당` 필터가 creator 기준으로 동작하고, 카드 상세 모달에 생성 시각이 없다.
2. **모바일 미대응** — 768px 미만에서 3컬럼이 그대로 표시되어 사용 불가.
3. **인라인 담당자 선택 없음** — 태스크 생성 시 담당자를 지정할 수 없다.

현재 DB는 Neon PostgreSQL(Vercel 연동). 기존 rows는 `assignee_id = NULL`, `created_at = NULL`로 마이그레이션된다.

## Goals / Non-Goals

**Goals:**
- Task 모델에 `assignee_id`, `created_at` 추가 및 API 반영
- `@me` 필터 → assignee_id 기준으로 전환, `미할당` 필터 정확화
- 카드 생성 시 담당자 선택 드롭다운 (인라인 폼)
- 768px 미만 칸반 1컬럼 탭 스와이프 + 햄버거 메뉴

**Non-Goals:**
- 담당자 변경 이력/알림
- 다중 담당자
- 모바일 푸시 알림

## Decisions

### 1. DB 마이그레이션 방식: SQLAlchemy `alter_table` 대신 컬럼 추가 직접 처리

**결정**: `Base.metadata.create_all()`은 기존 테이블에 새 컬럼을 추가하지 않는다. Neon(PostgreSQL)에서는 `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS` SQL을 앱 시작 시 직접 실행하여 컬럼을 추가한다.

**이유**: Alembic 마이그레이션 도입은 범위 초과. `ADD COLUMN IF NOT EXISTS`는 idempotent하여 재배포에도 안전하다.

**대안 검토**: Alembic → 설정 파일·revision 관리 필요, MVP 단계에서 오버스펙.

### 2. `@me` 필터 기준: creator_id → assignee_id 교체

**결정**: `assignee_id IS NULL`인 카드는 `미할당`으로 분류. `@me`는 `assignee_id = current_user_id`로 변경.

**이유**: 스토리보드 D·08 결정 #4 — "내 태스크 = WHERE assignee_id = current_user_id (creator 아님)".

**트레이드오프**: 기존 `creator_id` 기준 `@me` 필터 결과가 달라질 수 있으나 올바른 스펙 적용.

### 3. 모바일 칸반: CSS breakpoint + JS 탭 스위치

**결정**: Tailwind `md:` prefix로 데스크탑 3컬럼 유지, 768px 미만은 `hidden`/`block` 토글로 1컬럼 표시. 좌우 스와이프는 `touchstart`/`touchend` 이벤트로 구현.

**이유**: 별도 라이브러리 없이 Vanilla JS + Tailwind로 해결 가능. 의존성 추가 불필요.

## Risks / Trade-offs

- **[Risk] Neon cold start 중 ALTER TABLE 실패** → `IF NOT EXISTS` 구문으로 멱등성 보장, 에러 시 로그만 출력하고 앱 시작은 계속
- **[Risk] assignee_id 변경 후 기존 @me 필터 결과 변화** → 기존 rows는 assignee_id = NULL이므로 @me 결과가 0건이 됨. 사용자에게 담당자를 직접 지정하도록 유도
- **[Risk] 모바일 스와이프와 드래그 충돌** → 모바일(< 768px)에서는 드래그 비활성화, 탭 스위치로만 이동

## Migration Plan

1. `database.py`에 시작 시 `ALTER TABLE` 실행 로직 추가
2. `models.py`에 `assignee_id`, `created_at` 컬럼 추가
3. API 응답에 신규 필드 포함
4. `app.js` 필터 로직 수정 + 모바일 UI 추가
5. Vercel 재배포 → Neon에 자동 마이그레이션 적용

## Open Questions

- 담당자 없는 태스크를 카드에서 어떻게 표시할까? → `미할당` 텍스트 표시 (스토리보드 D·08 참조)
