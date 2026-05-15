## ADDED Requirements

### Requirement: 로컬 개발 환경 실행
개발자는 단일 명령으로 로컬 환경을 실행할 수 있어야 한다(SHALL). SQLite DB가 자동 생성되고 FE 정적 파일도 동일 서버에서 서빙된다.

#### Scenario: 로컬 서버 실행
- **WHEN** `uvicorn main:app --reload` 를 실행하면
- **THEN** http://localhost:8000 에서 FE와 BE가 모두 서빙되고, taskflow.db 파일이 자동 생성된다

#### Scenario: DB 자동 전환
- **WHEN** DATABASE_URL 환경변수가 설정되지 않으면
- **THEN** SQLite(`sqlite:///./taskflow.db`)가 자동 선택된다

---

### Requirement: Vercel 배포
개발자는 Vercel MCP를 통해 FE+BE를 5분 이내에 배포할 수 있어야 한다(SHALL). 배포 환경에서는 Vercel Storage Neon(PostgreSQL)을 DB로 사용한다.

#### Scenario: Vercel 배포 성공
- **WHEN** Vercel에 `SECRET_KEY`와 `DATABASE_URL`(Neon Pooled Connection) 환경변수를 설정하고 배포하면
- **THEN** 5분 이내에 공개 URL로 앱이 접근 가능하고, Neon DB에 연결된다

#### Scenario: Neon DB 자동 연결
- **WHEN** DATABASE_URL에 Neon Pooled Connection URL이 설정되면
- **THEN** SQLAlchemy가 PostgreSQL 드라이버로 자동 전환되고 테이블이 자동 생성된다

---

### Requirement: 환경변수 관리
배포 환경의 필수 환경변수는 명시적으로 관리되어야 한다(SHALL).

#### Scenario: 필수 환경변수 목록
- **WHEN** Vercel 배포 환경을 구성할 때
- **THEN** 다음 환경변수가 반드시 설정되어야 한다: `SECRET_KEY`(JWT 서명키), `DATABASE_URL`(Neon Pooled URL)
