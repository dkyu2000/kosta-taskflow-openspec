## ADDED Requirements

### Requirement: 태스크 생성
팀 멤버는 팀의 칸반 보드에 태스크를 추가할 수 있어야 한다(SHALL). 신규 태스크의 초기 상태는 항상 TODO이다.

#### Scenario: 정상 태스크 생성
- **WHEN** 팀 멤버가 POST /teams/{id}/tasks에 태스크 제목을 전송하면
- **THEN** HTTP 201, `{"task_id": <id>, "title": "<title>", "status": "TODO", "creator_id": <id>}` 를 반환한다

#### Scenario: 제목 누락
- **WHEN** 제목 없이 POST /teams/{id}/tasks를 호출하면
- **THEN** HTTP 422, `{"code": "MISSING_TITLE", "msg": "태스크 제목을 입력해주세요"}` 를 반환한다

---

### Requirement: 태스크 목록 조회
팀 멤버는 팀의 모든 태스크를 조회할 수 있어야 한다(SHALL). 응답은 status별로 그룹화하여 반환한다.

#### Scenario: 태스크 목록 반환
- **WHEN** GET /teams/{id}/tasks를 호출하면
- **THEN** HTTP 200, `[{"task_id": <id>, "title": "<title>", "status": "TODO|DOING|DONE", "creator_id": <id>}]` 배열을 반환한다

---

### Requirement: 태스크 상태 변경
팀 멤버는 태스크의 상태를 TODO / DOING / DONE 중 하나로 변경할 수 있어야 한다(SHALL). 드래그 앤 드롭 UI로 상태를 변경하며, 변경 시 PUT /tasks/{id} 를 호출한다.

#### Scenario: 상태 변경 성공
- **WHEN** PUT /tasks/{id}에 `{"status": "DOING"}` 을 전송하면
- **THEN** HTTP 200, 업데이트된 태스크 객체를 반환한다

#### Scenario: 유효하지 않은 상태값
- **WHEN** TODO/DOING/DONE 이외의 status 값으로 PUT /tasks/{id}를 호출하면
- **THEN** HTTP 422, `{"code": "INVALID_STATUS", "msg": "status는 TODO, DOING, DONE 중 하나여야 합니다"}` 를 반환한다

---

### Requirement: 태스크 제목 수정
팀 멤버는 태스크 제목을 수정할 수 있어야 한다(SHALL).

#### Scenario: 제목 수정 성공
- **WHEN** PUT /tasks/{id}에 `{"title": "<new_title>"}` 을 전송하면
- **THEN** HTTP 200, 업데이트된 태스크 객체를 반환한다

---

### Requirement: 태스크 삭제
팀 멤버는 태스크를 삭제할 수 있어야 한다(SHALL).

#### Scenario: 태스크 삭제 성공
- **WHEN** DELETE /tasks/{id}를 호출하면
- **THEN** HTTP 200, `{"msg": "삭제되었습니다"}` 를 반환하고 칸반에서 제거된다

#### Scenario: 존재하지 않는 태스크 삭제 시도
- **WHEN** 존재하지 않는 task_id로 DELETE /tasks/{id}를 호출하면
- **THEN** HTTP 404, `{"code": "TASK_NOT_FOUND", "msg": "태스크를 찾을 수 없습니다"}` 를 반환한다

---

### Requirement: 칸반 UI 드래그 앤 드롭
프론트엔드는 HTML5 Drag and Drop API를 사용하여 태스크 카드를 컬럼 간 이동할 수 있어야 한다(SHALL). 드롭 완료 시 50ms 이내에 UI가 반응하고, API 호출로 상태를 서버에 저장한다.

#### Scenario: 카드 드래그 앤 드롭
- **WHEN** 사용자가 TODO 컬럼의 카드를 DOING 컬럼으로 드래그하여 드롭하면
- **THEN** 50ms 이내에 카드가 DOING 컬럼으로 이동하고 PUT /tasks/{id} 호출로 상태가 저장된다
