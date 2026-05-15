## Context

신규 프로젝트 — 기존 코드베이스 없음. FastAPI(Python) 백엔드와 Vanilla JS + Tailwind 프론트엔드를 단일 리포지토리에서 구성한다. 로컬 개발은 SQLite, 배포는 Vercel + Neon(PostgreSQL)을 사용한다.

대상 사용자: 한국어 사용 소규모 팀(팀당 5명 이내, 동시 50명). 최신 Chrome/Safari 지원.

## Goals / Non-Goals

**Goals:**
- 인증·팀·칸반·채팅·배포 5종 기능을 Day 2 안에 완성
- 로컬(SQLite) ↔ 배포(Neon) 환경 전환을 코드 변경 없이 DATABASE_URL 하나로 처리
- Vercel MCP 원클릭 배포로 학습자가 직접 배포 경험

**Non-Goals:**
- WebSocket 실시간 통신 (5초 폴링으로 대체)
- 파일 첨부, 전문 검색, 이메일/SMS 알림
- pytest/jest 자동 테스트
- 마이크로서비스 분리, 수평 확장

## Decisions

### 1. 단일 서버 일체형 구조 (FE StaticFiles + BE API)
- FastAPI가 `/api/*` REST 엔드포인트와 `/` 정적 파일 모두 서빙
- **이유**: Vercel Serverless Function 1개로 배포 단순화. CORS 설정 불필요(동일 오리진)
- **대안**: FE/BE 별도 배포 → Vercel 프로젝트 2개 관리 복잡도 증가로 기각

### 2. SQLAlchemy ORM + 환경변수 DB 전환
- `DATABASE_URL` 미설정 시 `sqlite:///./taskflow.db`, 설정 시 Neon PostgreSQL URL 사용
- **이유**: 코드 변경 없이 로컬↔배포 전환 가능
- **대안**: Prisma, Tortoise-ORM → Python 생태계 표준 SQLAlchemy 선택

### 3. JWT HS256, 24h 만료, 갱신 없음
- `python-jose` 라이브러리, 시크릿 키 환경변수(`SECRET_KEY`)
- localStorage 저장, Authorization: Bearer 헤더 전송
- **이유**: MVP 범위 — refresh token 구현 생략으로 단순화
- **트레이드오프**: 24h 후 강제 재로그인 필요

### 4. 채팅 5초 폴링 (WebSocket 미사용)
- `GET /teams/{id}/messages?since=<timestamp>` 로 증분 조회
- 프론트 `setInterval(5000)` 로 자동 호출
- **이유**: WebSocket은 Vercel Serverless에서 지원 불가
- **트레이드오프**: 최대 5초 지연, 불필요한 요청 발생

### 5. 칸반 드래그: HTML5 Drag and Drop API
- 외부 라이브러리 없이 `dragstart`/`dragover`/`drop` 이벤트 처리
- 드롭 시 `PUT /tasks/{id}` status 업데이트
- **이유**: Vanilla JS 제약, CDN 의존 최소화

### 6. 비밀번호 bcrypt 해시 (passlib)
- `passlib[bcrypt]` 라이브러리 사용, 평문 저장 금지
- **이유**: 보안 필수 요건

### 7. 초대코드 형식: `XXXX-XXXX` (8자 랜덤 알파벳+숫자)
- `secrets.token_hex` 기반 생성, teams.invite_code UNIQUE 인덱스
- 팀당 1개, 재발급 없음 (MVP 범위)

## Risks / Trade-offs

- [SQLite 동시성] 쓰기 잠금 → 개발 환경에서만 사용, 배포는 Neon으로 해소
- [JWT 탈취] localStorage 저장으로 XSS 취약 → MVP 범위 내 허용, HttpOnly 쿠키는 추후 개선
- [폴링 부하] 동시 50명 × 5초 = 초당 10 req → Neon Free 티어(500MB) 범위 내
- [Vercel 타임아웃] Serverless Function 10s 제한 → DB 쿼리 단순 SELECT/INSERT로 해소

## Migration Plan

1. 로컬: `uvicorn main:app --reload` 실행, SQLite 자동 생성
2. 배포: Vercel에 `SECRET_KEY`, `DATABASE_URL`(Neon Pooled) 환경변수 설정 후 `vercel deploy`
3. 롤백: Vercel 대시보드에서 이전 배포 버전으로 Instant Rollback

## Open Questions

- Vercel Serverless에서 SQLAlchemy connection pool 설정 최적값 (기본값 사용 예정)
- 초대코드 재발급 필요성 (MVP 이후 검토)
