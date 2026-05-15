## Why

소규모 팀이 업무 진행 상황을 한 화면에서 칸반과 실시간 채팅으로 추적할 수 있는 MVP가 없다. 팀 리더는 태스크 현황을 한눈에 파악하고, 팀원은 드래그로 상태를 바꾸며, 신규 합류자는 초대코드 하나로 1분 안에 컨텍스트를 파악할 수 있어야 한다.

## What Changes

- 이메일/비밀번호 기반 회원가입·로그인 + JWT 인증 도입
- 팀 생성·초대코드 발급·합류·멤버 목록 기능 추가
- TODO / DOING / DONE 3컬럼 칸반 보드 (드래그 상태 이동) 추가
- 팀 단위 채팅 (5초 폴링, 발신자·시각 표시) 추가
- FastAPI 백엔드 + Vanilla JS + Tailwind 프론트엔드 구조 신규 구축
- 로컬 SQLite(개발) / Vercel Storage Neon(배포) 이중 DB 환경 구성
- Vercel MCP를 통한 FE+BE 원클릭 배포 파이프라인 추가

## Capabilities

### New Capabilities

- `auth`: 회원가입, 로그인, JWT 발급·검증, 비밀번호 bcrypt 해시
- `team`: 팀 생성, 초대코드 발급·합류, 멤버 목록 조회
- `kanban`: 태스크 CRUD, TODO/DOING/DONE 상태 이동, 드래그 UI
- `chat`: 팀 채팅 송수신, 5초 폴링, 메시지 이력 조회
- `deployment`: Vercel FE+BE 배포, Vercel Storage Neon DB 연동

### Modified Capabilities

(없음 — 신규 프로젝트)

## Impact

- **Backend**: FastAPI 앱 신규 생성. SQLAlchemy ORM, 4테이블(users/teams/tasks/messages), API 18개 엔드포인트
- **Frontend**: Vanilla JS + Tailwind, 화면 4종(로그인·팀선택·칸반·채팅), StaticFiles 서빙
- **DB**: 로컬 SQLite ↔ 배포 Neon 자동 전환 (환경변수 DATABASE_URL)
- **Auth**: JWT HS256, 만료 24h, localStorage 저장, 갱신 없음
- **배포**: Vercel (FE+BE 일체형), Vercel Storage Neon Pooled Connection 자동 주입
- **Out of Scope**: 알림·파일 첨부·전문검색·권한세분화·다국어·WebSocket·테스트 자동화 제외
