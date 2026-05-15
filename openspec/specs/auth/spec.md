# Auth Spec

## Purpose

사용자 인증 및 세션 관리를 담당한다. 이메일/비밀번호 기반 회원가입·로그인, JWT 발급 및 검증, 현재 사용자 조회, 로그아웃 기능을 제공한다.

## Requirements

### Requirement: 회원가입
시스템은 이메일과 비밀번호를 받아 신규 사용자를 등록해야 한다(SHALL). 비밀번호는 bcrypt로 해시하여 저장하며 평문 저장은 금지한다. 이메일은 UNIQUE 제약을 적용한다.

#### Scenario: 정상 회원가입
- **WHEN** POST /auth/signup에 유효한 이메일과 8자 이상 비밀번호를 전송하면
- **THEN** HTTP 201, JWT 토큰과 user_id를 포함한 JSON을 반환한다

#### Scenario: 중복 이메일 가입 시도
- **WHEN** 이미 등록된 이메일로 POST /auth/signup을 호출하면
- **THEN** HTTP 409, `{"code": "EMAIL_EXISTS", "msg": "이미 사용 중인 이메일입니다"}` 를 반환한다

#### Scenario: 비밀번호 형식 오류
- **WHEN** 비밀번호가 7자 이하인 경우
- **THEN** HTTP 422, `{"code": "INVALID_PASSWORD", "msg": "비밀번호는 8자 이상이어야 합니다"}` 를 반환한다

---

### Requirement: 로그인
시스템은 이메일·비밀번호를 검증하여 JWT를 발급해야 한다(SHALL). JWT는 HS256 알고리즘, 만료 24시간, `SECRET_KEY` 환경변수로 서명한다.

#### Scenario: 정상 로그인
- **WHEN** POST /auth/login에 등록된 이메일과 올바른 비밀번호를 전송하면
- **THEN** HTTP 200, `{"token": "<jwt>", "user_id": <id>}` 를 반환한다

#### Scenario: 잘못된 비밀번호
- **WHEN** 등록된 이메일에 틀린 비밀번호로 POST /auth/login을 호출하면
- **THEN** HTTP 401, `{"code": "INVALID_CREDENTIALS", "msg": "이메일 또는 비밀번호가 올바르지 않습니다"}` 를 반환한다

---

### Requirement: 현재 사용자 조회
인증된 사용자는 자신의 정보를 조회할 수 있어야 한다(SHALL). Authorization: Bearer 헤더의 JWT를 검증하여 user_id·email을 반환한다.

#### Scenario: 유효한 토큰으로 조회
- **WHEN** 유효한 JWT를 Authorization 헤더에 포함하여 GET /auth/me를 호출하면
- **THEN** HTTP 200, `{"user_id": <id>, "email": "<email>"}` 를 반환한다

#### Scenario: 만료된 토큰
- **WHEN** 만료된 JWT로 GET /auth/me를 호출하면
- **THEN** HTTP 401, `{"code": "TOKEN_EXPIRED", "msg": "토큰이 만료되었습니다"}` 를 반환한다

---

### Requirement: 로그아웃
로그아웃은 서버 측 상태 없이 클라이언트가 localStorage에서 토큰을 삭제하는 방식으로 처리한다(SHALL). POST /auth/logout은 HTTP 200을 반환한다.

#### Scenario: 로그아웃 요청
- **WHEN** POST /auth/logout을 호출하면
- **THEN** HTTP 200, `{"msg": "로그아웃되었습니다"}` 를 반환하고 클라이언트는 토큰을 삭제한다
