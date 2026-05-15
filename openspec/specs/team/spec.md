# Team Spec

## Purpose

팀 생성·합류·조회 및 팀 멤버 관리를 담당한다. 초대코드 기반으로 팀원을 초대하며, 소속 팀 및 멤버 목록 조회 기능을 제공한다.

## Requirements

### Requirement: 팀 생성
인증된 사용자는 팀을 생성할 수 있어야 한다(SHALL). 팀 생성 시 `XXXX-XXXX` 형식의 고유 초대코드가 자동 발급되며, 생성자는 자동으로 owner가 된다.

#### Scenario: 정상 팀 생성
- **WHEN** 인증된 사용자가 POST /teams에 팀 이름을 전송하면
- **THEN** HTTP 201, `{"team_id": <id>, "name": "<name>", "invite_code": "ABCD-1234"}` 를 반환한다

#### Scenario: 팀 이름 누락
- **WHEN** 팀 이름 없이 POST /teams를 호출하면
- **THEN** HTTP 422, `{"code": "MISSING_NAME", "msg": "팀 이름을 입력해주세요"}` 를 반환한다

---

### Requirement: 초대코드로 팀 합류
사용자는 유효한 초대코드를 입력하여 팀에 합류할 수 있어야 한다(SHALL). 이미 소속된 팀에 재합류 시도는 오류를 반환한다.

#### Scenario: 정상 합류
- **WHEN** POST /teams/join에 유효한 invite_code를 전송하면
- **THEN** HTTP 200, `{"team_id": <id>, "name": "<team_name>"}` 를 반환하고 멤버로 등록된다

#### Scenario: 잘못된 초대코드
- **WHEN** 존재하지 않는 초대코드로 POST /teams/join을 호출하면
- **THEN** HTTP 404, `{"code": "INVALID_INVITE_CODE", "msg": "유효하지 않은 초대코드입니다"}` 를 반환한다

#### Scenario: 이미 소속된 팀
- **WHEN** 이미 소속된 팀의 초대코드로 POST /teams/join을 호출하면
- **THEN** HTTP 409, `{"code": "ALREADY_MEMBER", "msg": "이미 팀원입니다"}` 를 반환한다

---

### Requirement: 내 팀 목록 조회
인증된 사용자는 자신이 소속된 팀 목록을 조회할 수 있어야 한다(SHALL).

#### Scenario: 팀 목록 반환
- **WHEN** GET /teams를 호출하면
- **THEN** HTTP 200, 소속 팀 배열 `[{"team_id": <id>, "name": "<name>", "invite_code": "<code>"}]` 를 반환한다

#### Scenario: 소속 팀 없음
- **WHEN** 소속 팀이 없는 사용자가 GET /teams를 호출하면
- **THEN** HTTP 200, 빈 배열 `[]` 을 반환한다

---

### Requirement: 팀 멤버 목록 조회
팀 멤버는 해당 팀의 멤버 목록을 조회할 수 있어야 한다(SHALL).

#### Scenario: 멤버 목록 반환
- **WHEN** 팀 멤버가 GET /teams/{id}/members를 호출하면
- **THEN** HTTP 200, `[{"user_id": <id>, "email": "<email>"}]` 배열을 반환한다

#### Scenario: 비소속 사용자의 멤버 조회 시도
- **WHEN** 해당 팀에 소속되지 않은 사용자가 GET /teams/{id}/members를 호출하면
- **THEN** HTTP 403, `{"code": "NOT_MEMBER", "msg": "팀 멤버가 아닙니다"}` 를 반환한다
