## 1. 백엔드 — 모델 및 마이그레이션

- [ ] 1.1 `models.py` Task 모델에 `assignee_id` (Integer, nullable, FK users.id) 컬럼 추가
- [ ] 1.2 `models.py` Task 모델에 `created_at` (DateTime, default=utcnow) 컬럼 추가
- [ ] 1.3 `database.py` 앱 시작 시 `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id INTEGER REFERENCES users(id)` 실행
- [ ] 1.4 `database.py` 앱 시작 시 `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()` 실행

## 2. 백엔드 — API 업데이트

- [ ] 2.1 `routers/tasks.py` POST /teams/{id}/tasks: body에서 `assignee_id` 선택 파라미터 수신 및 저장
- [ ] 2.2 `routers/tasks.py` GET /teams/{id}/tasks 응답에 `assignee_id`, `created_at` 필드 포함
- [ ] 2.3 `routers/tasks.py` GET /tasks/{id} 응답에 `assignee_id`, `created_at` 필드 포함
- [ ] 2.4 `routers/tasks.py` PUT /tasks/{id}: `assignee_id` 업데이트 지원 (null 허용)

## 3. 프론트엔드 — 칸반 필터 및 카드

- [ ] 3.1 `app.js` `@me` 필터 로직을 `creator_id` → `assignee_id` 기준으로 변경
- [ ] 3.2 `app.js` `미할당` 필터 로직을 `assignee_id IS NULL` 기준으로 변경
- [ ] 3.3 `app.js` 카드 표시 레이블을 assignee_id 기준 `@me` / `@email` / `미할당`으로 변경
- [ ] 3.4 `app.js` 카드 상세 모달에 `created_at` 생성 시각 표시 (`YYYY-MM-DD HH:mm` 포맷)

## 4. 프론트엔드 — 인라인 담당자 선택

- [ ] 4.1 `app.js` `startInlineAdd()` 폼에 `담당자: @me ▼` 드롭다운 추가 (팀 멤버 목록 표시)
- [ ] 4.2 `app.js` 인라인 폼 Enter 제출 시 선택된 `assignee_id` 포함하여 API 호출

## 5. 프론트엔드 — 모바일 반응형

- [ ] 5.1 `index.html` 768px 미만 칸반 헤더에 ≡ 햄버거 버튼 추가, 탭 버튼 `hidden md:flex` 처리
- [ ] 5.2 `index.html` 모바일 슬라이드 메뉴 패널 HTML 추가 (사용자정보/칸반/채팅/멤버/로그아웃)
- [ ] 5.3 `index.html` 768px 미만 칸반 보드에 TODO/DOING/DONE 탭 인디케이터 바 추가
- [ ] 5.4 `app.js` 햄버거 메뉴 열기/닫기 로직 구현
- [ ] 5.5 `app.js` 모바일 칸반 탭 클릭 시 해당 컬럼만 표시하는 로직 구현
- [ ] 5.6 `app.js` `touchstart` / `touchend` 이벤트로 좌우 스와이프 컬럼 전환 구현
- [ ] 5.7 `app.js` 모바일 채팅 입력 포커스 시 `visualViewport` API로 메시지 영역 높이 조정
