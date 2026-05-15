## ADDED Requirements

### Requirement: 메시지 전송
팀 멤버는 팀 채팅방에 텍스트 메시지를 전송할 수 있어야 한다(SHALL). 메시지는 최대 1000자이며, 발신자 정보와 ISO 8601 형식의 created_at을 포함한다.

#### Scenario: 정상 메시지 전송
- **WHEN** POST /teams/{id}/messages에 `{"content": "안녕하세요"}` 를 전송하면
- **THEN** HTTP 201, `{"message_id": <id>, "user_id": <id>, "email": "<email>", "content": "<content>", "created_at": "2024-01-01T12:00:00Z"}` 를 반환한다

#### Scenario: 메시지 1000자 초과
- **WHEN** 1001자 이상의 content로 POST /teams/{id}/messages를 호출하면
- **THEN** HTTP 422, `{"code": "MESSAGE_TOO_LONG", "msg": "메시지는 1000자 이내여야 합니다"}` 를 반환한다

#### Scenario: 빈 메시지 전송
- **WHEN** 빈 문자열 content로 POST /teams/{id}/messages를 호출하면
- **THEN** HTTP 422, `{"code": "EMPTY_MESSAGE", "msg": "메시지를 입력해주세요"}` 를 반환한다

---

### Requirement: 메시지 이력 조회 (폴링)
팀 멤버는 팀 채팅 메시지를 조회할 수 있어야 한다(SHALL). `since` 쿼리 파라미터로 특정 시각 이후 메시지만 증분 조회가 가능하다. 프론트엔드는 5초마다 자동 호출하여 새 메시지를 표시한다.

#### Scenario: 전체 메시지 조회
- **WHEN** GET /teams/{id}/messages를 호출하면
- **THEN** HTTP 200, 최신순 메시지 배열 `[{"message_id": <id>, "user_id": <id>, "email": "<email>", "content": "<content>", "created_at": "<ISO8601>"}]` 을 반환한다

#### Scenario: 증분 조회
- **WHEN** GET /teams/{id}/messages?since=2024-01-01T12:00:00Z 를 호출하면
- **THEN** HTTP 200, 해당 시각 이후 전송된 메시지만 포함한 배열을 반환한다

#### Scenario: 새 메시지 없음
- **WHEN** since 이후 새 메시지가 없을 때 폴링 요청이 오면
- **THEN** HTTP 200, 빈 배열 `[]` 을 반환한다

---

### Requirement: 메시지 삭제
팀 멤버는 메시지를 삭제할 수 있어야 한다(SHALL).

#### Scenario: 메시지 삭제 성공
- **WHEN** DELETE /messages/{id}를 호출하면
- **THEN** HTTP 200, `{"msg": "삭제되었습니다"}` 를 반환한다

#### Scenario: 존재하지 않는 메시지 삭제
- **WHEN** 존재하지 않는 message_id로 DELETE /messages/{id}를 호출하면
- **THEN** HTTP 404, `{"code": "MESSAGE_NOT_FOUND", "msg": "메시지를 찾을 수 없습니다"}` 를 반환한다

---

### Requirement: 채팅 UI 자동 갱신
프론트엔드 채팅 화면은 5초마다 자동으로 새 메시지를 폴링하여 표시해야 한다(SHALL). 메시지 목록에는 발신자 이메일과 전송 시각이 표시된다.

#### Scenario: 자동 새 메시지 표시
- **WHEN** 다른 사용자가 메시지를 전송하면
- **THEN** 최대 5초 내에 수신자 화면에 새 메시지가 자동으로 표시된다
