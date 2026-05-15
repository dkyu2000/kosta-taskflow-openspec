## Why

스토리보드 v2에 정의된 기능 중 MVP 초기 구현에서 누락된 항목들이 있다. 배포 후 실사용 흐름을 완성하기 위해 태스크 담당자 지정, 모바일 대응, 카드 생성일 표시를 순차적으로 반영한다.

## What Changes

- **태스크 assignee_id 추가**: Task 모델에 `assignee_id` (nullable FK → users) 추가. 칸반 카드 생성 시 담당자 지정, `@me` / `미할당` 필터가 creator_id 대신 assignee_id 기준으로 동작
- **태스크 created_at 추가**: Task 모델에 `created_at` 컬럼 추가. 카드 상세 모달에서 생성 시각 표시
- **모바일 반응형 칸반**: 768px 미만에서 3컬럼 → 1컬럼 탭 스와이프 (TODO / DOING / DONE 탭 인디케이터)
- **모바일 햄버거 메뉴**: 768px 미만 헤더에서 탭 버튼 숨기고 ≡ 메뉴로 통합 (칸반 / 채팅 / 멤버 / 로그아웃)
- **카드 인라인 담당자 선택**: 인라인 태스크 추가 폼에 `담당자: @me ▼` 드롭다운 추가 (팀 멤버 목록에서 선택)

## Capabilities

### New Capabilities
없음 — 기존 칸반·모바일 역량의 요구사항 변경

### Modified Capabilities
- `kanban`: assignee_id 기반 필터(@me / 미할당), created_at 표시, 인라인 담당자 선택 드롭다운, 모바일 1컬럼 탭 스와이프 추가
- `mobile`: 768px breakpoint 칸반 스와이프, 햄버거 슬라이드 메뉴 구현 (스토리보드 F·01~F·03)

## Impact

- **Backend**: `tasks` 테이블에 `assignee_id` (Integer, nullable, FK users.id), `created_at` (DateTime, default=utcnow) 컬럼 추가. DB 마이그레이션 필요 (SQLite ALTER 또는 테이블 재생성)
- **API**: `GET /api/teams/{id}/tasks` 응답에 `assignee_id`, `created_at` 포함. `POST /api/teams/{id}/tasks` body에 `assignee_id` 선택 파라미터 추가. `PUT /api/tasks/{id}` body에 `assignee_id` 업데이트 지원
- **Frontend**: `static/index.html`, `static/app.js` — 필터 로직, 인라인 폼 드롭다운, 모달 생성일 표시, 모바일 CSS 추가
- **기존 데이터**: `assignee_id = NULL`, `created_at = NULL`로 마이그레이션 (nullable이므로 하위 호환)
