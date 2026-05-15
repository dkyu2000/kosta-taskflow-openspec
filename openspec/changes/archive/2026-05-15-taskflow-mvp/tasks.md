## 1. 프로젝트 초기 설정

- [x] 1.1 디렉토리 구조 생성 (backend/, frontend/static/, frontend/index.html)
- [x] 1.2 requirements.txt 작성 (fastapi, uvicorn, sqlalchemy, python-jose, passlib[bcrypt], psycopg2-binary)
- [x] 1.3 main.py 생성 — FastAPI 앱 초기화, StaticFiles 마운트, CORS 설정
- [x] 1.4 database.py 생성 — DATABASE_URL 환경변수 기반 SQLite/Neon 자동 전환 엔진 설정
- [x] 1.5 models.py 생성 — users, teams, team_members, tasks, messages 테이블 SQLAlchemy 모델 정의
- [x] 1.6 DB 테이블 자동 생성 (Base.metadata.create_all) 및 로컬 실행 확인

## 2. 인증 (Auth)

- [x] 2.1 auth/router.py 생성 — POST /auth/signup 구현 (bcrypt 해시, JWT 발급, 201 반환)
- [x] 2.2 POST /auth/login 구현 (비밀번호 검증, JWT 발급, 200 반환)
- [x] 2.3 GET /auth/me 구현 (JWT 검증 미들웨어, user_id·email 반환)
- [x] 2.4 POST /auth/logout 구현 (200 반환)
- [x] 2.5 JWT 유틸 함수 작성 (create_token, verify_token, get_current_user 의존성)

## 3. 팀 (Team)

- [x] 3.1 teams/router.py 생성 — POST /teams 구현 (XXXX-XXXX 초대코드 생성, 팀 생성, 201 반환)
- [x] 3.2 GET /teams 구현 (소속 팀 목록 반환)
- [x] 3.3 POST /teams/join 구현 (초대코드 검증, 멤버 추가, 200 반환)
- [x] 3.4 GET /teams/{id}/members 구현 (멤버 목록 반환, 비소속 403 처리)

## 4. 칸반 (Kanban)

- [x] 4.1 tasks/router.py 생성 — POST /teams/{id}/tasks 구현 (초기 상태 TODO, 201 반환)
- [x] 4.2 GET /teams/{id}/tasks 구현 (태스크 목록 반환)
- [x] 4.3 PUT /tasks/{id} 구현 (status 또는 title 업데이트, 유효성 검증)
- [x] 4.4 DELETE /tasks/{id} 구현 (태스크 삭제, 404 처리)
- [x] 4.5 GET /tasks/{id} 구현 (단건 조회)

## 5. 채팅 (Chat)

- [x] 5.1 messages/router.py 생성 — POST /teams/{id}/messages 구현 (1000자 제한, 201 반환)
- [x] 5.2 GET /teams/{id}/messages 구현 (?since= 증분 조회 지원)
- [x] 5.3 GET /messages/{id} 구현 (단건 조회)
- [x] 5.4 DELETE /messages/{id} 구현 (삭제, 404 처리)

## 6. 프론트엔드

- [x] 6.1 로그인/회원가입 화면 구현 (Vanilla JS + Tailwind, 이메일·비밀번호 입력, JWT localStorage 저장)
- [x] 6.2 팀 선택 화면 구현 (내 팀 목록, 팀 만들기, 초대코드 입력·합류)
- [x] 6.3 칸반 화면 구현 (TODO/DOING/DONE 3컬럼, 태스크 추가/삭제, HTML5 드래그 앤 드롭)
- [x] 6.4 채팅 화면 구현 (메시지 리스트, 입력창, 발신자·시각 표시)
- [x] 6.5 채팅 5초 폴링 구현 (setInterval + GET /messages?since= 증분 호출)
- [x] 6.6 화면 간 라우팅 구현 (로그인→팀선택→칸반/채팅 전환)
- [x] 6.7 API 호출 유틸 함수 작성 (Authorization 헤더 자동 주입, 에러 처리)

## 7. 배포

- [x] 7.1 vercel.json 작성 (FastAPI Serverless Function 설정)
- [ ] 7.2 Vercel 프로젝트 생성 및 SECRET_KEY, DATABASE_URL 환경변수 설정
- [ ] 7.3 Vercel MCP로 배포 실행 및 공개 URL 동작 확인
- [ ] 7.4 배포 환경에서 Neon DB 연결 및 테이블 자동 생성 확인
