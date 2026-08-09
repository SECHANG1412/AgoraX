# AGENTS.md

이 문서는 이 저장소에서 작업하는 코딩 에이전트가 따라야 할 프로젝트 공통 지침이다.

## 프로젝트 개요

- Waggle은 2지선다 토픽 생성, 투표, 댓글·답글, 좋아요, 신고·문의, 알림과 관리자 기능을 제공하는 커뮤니티 서비스다.
- 백엔드는 Python 3.11, FastAPI, SQLAlchemy, Alembic을 사용한다.
- 프론트엔드는 Node.js 20, React, TypeScript, Vite를 사용한다.
- MySQL과 Redis를 사용하며 Docker Compose로 로컬 서비스와 Prometheus·Grafana 환경을 구성한다.
- GitHub Actions의 CI는 백엔드 lint·통합 테스트와 프론트엔드 lint·typecheck·build를 수행한다.

## 작업 시작 순서

1. 사용자 요청과 수정 허용 범위를 먼저 확인한다.
2. 루트 `README.md`를 읽고 프로젝트의 목적, 실행 방법과 검증 절차를 파악한다.
3. 작업 영역의 문서와 설정을 확인한다.
   - 백엔드: `backend/tests/README.md`, `backend/pyproject.toml`, requirements 파일
   - 프론트엔드: `frontend/README.md`, `frontend/package.json`
   - CI/CD: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
   - 실행 환경: `docker-compose.yml`, `docker-compose.override.yml`, `.env.example` 파일
4. 문서의 설명을 그대로 가정하지 말고 실제 코드와 설정을 근거로 교차 확인한다.
5. 기존 작업 트리의 변경사항을 확인하고 사용자 변경을 덮어쓰거나 되돌리지 않는다.

## 분석 및 수정 원칙

- 사용자가 점검, 분석, 리뷰 또는 요약만 요청하면 파일을 수정하지 않는다.
- 확인된 사실과 추론을 구분하고, 관련 파일과 설정을 근거로 결과를 설명한다.
- 수정 요청에서는 요구사항을 충족하는 최소 범위만 변경한다.
- 관련 없는 리팩터링, 포맷 변경, 의존성 추가와 생성 파일 변경을 함께 넣지 않는다.
- API 계약이나 동작을 변경하면 관련 통합 테스트와 문서를 함께 갱신한다.
- 데이터베이스 스키마 변경에는 Alembic migration을 포함하고 적용 순서와 롤백 영향을 확인한다.
- 성능 수치는 동일한 환경, 스크립트와 seed data를 사용한 결과만 비교한다.

## 주요 디렉터리

- `backend/app/routers`: FastAPI 엔드포인트
- `backend/app/services`: 도메인 로직과 외부 서비스 연동
- `backend/app/db`: SQLAlchemy 모델·스키마·CRUD
- `backend/app/middleware`: 인증, CSRF, Rate Limit과 관측 미들웨어
- `backend/tests/integration`: API 통합 테스트
- `frontend/src/Components`: 재사용 UI 컴포넌트
- `frontend/src/Pages`: 사용자 및 관리자 화면
- `frontend/src/hooks`: 공통 React 훅
- `frontend/src/utils`: API 클라이언트와 공통 유틸리티
- `k6`: 부하 테스트와 Rate Limit 검증 스크립트
- `.github/workflows`: CI 및 배포 워크플로

## 검증 명령어

변경 영역에 해당하는 검증을 저장소 루트 기준으로 실행한다.

### 백엔드

```bash
cd backend
ruff check app main.py tests
pytest -q tests/integration
```

### 프론트엔드

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm run build
```

- 문서만 변경한 경우에는 코드 테스트를 생략할 수 있지만, 문서에 적힌 버전·명령어·CI 작업을 실제 설정과 대조한다.
- 테스트를 실행하지 못했거나 생략했다면 완료 보고에 이유와 미검증 범위를 명시한다.

## 환경변수와 보안

- 실제 비밀정보, 토큰, OAuth secret, 운영 데이터와 개인 식별 정보를 커밋하거나 출력하지 않는다.
- `.env.example`에는 예시 값과 필요한 변수명만 유지한다.
- 인증 쿠키, CSRF, OAuth state, 권한 검사와 Rate Limit 변경은 보안 회귀 가능성을 우선 검토한다.
- 배포, migration, 비밀정보 변경과 외부 서비스 조작은 사용자 요청과 권한을 확인한 뒤 수행한다.

## 문서와 Git

- `README.md`, 하위 README, 워크플로와 실제 명령 사이의 불일치를 만들지 않는다.
- 커밋에는 하나의 논리적 변경만 포함한다.
- 커밋 메시지는 `<prefix>: <한글 설명>` 형식을 사용한다.
- 일반적인 prefix는 `feat`, `fix`, `refactor`, `test`, `docs`, `chore`다.
- 요청 없이 원격 저장소에 push하거나 PR을 생성하지 않는다.
- 완료 보고에는 변경 파일, 실행한 검증, 생략한 검증과 남은 위험을 포함한다.
