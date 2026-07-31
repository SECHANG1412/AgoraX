# Waggle

> 2지선다 토픽을 만들고 투표 결과와 댓글 의견을 공유하는 투표 기반 커뮤니티 서비스

[서비스 바로가기](https://www.waggle.kr) · [GitHub 저장소](https://github.com/SECHANG1412/Waggle-Service)

> 현재 AWS EC2 운영을 일시 중단하여 서비스 접속이 제한될 수 있습니다.

| 구분 | 내용 |
| --- | --- |
| 진행 기간 | 2025.11 ~ 진행 중 |
| 프로젝트 형태 | 개인 프로젝트 |
| 담당 범위 | 백엔드 API 설계·구현, 프론트엔드 구현, 배포·운영 환경 구성 |
| 핵심 기능 | 토픽 생성, 투표, 결과 시각화, 댓글·답글, 좋아요, 신고·문의, 알림, 관리자 운영 |

## 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [핵심 성과](#핵심-성과)
3. [기술 스택](#기술-스택)
4. [시스템 아키텍처](#시스템-아키텍처)
5. [핵심 문제 해결](#핵심-문제-해결)
6. [주요 기능](#주요-기능)
7. [실행 방법](#실행-방법)
8. [테스트 및 성능 검증](#테스트-및-성능-검증)
9. [향후 개선 계획](#향후-개선-계획)

## 프로젝트 개요

Waggle은 사용자가 다양한 주제의 2지선다 토픽을 만들고, 투표 결과를 확인하며, 댓글과 답글로 의견을 나눌 수 있는 커뮤니티 서비스입니다. 토픽 생성과 투표뿐 아니라 소셜 로그인, 좋아요, 신고·문의, 마감 알림, 관리자 콘텐츠 운영 기능까지 구현했습니다.

기능 구현에 그치지 않고 AWS EC2, Nginx, Docker Compose 기반의 운영 환경을 구성했습니다. 또한 k6 부하 테스트와 Prometheus/Grafana·CloudWatch 관측 지표를 함께 사용해 API 병목을 진단하고, GitHub Actions로 검증과 배포 과정을 자동화했습니다.

## 핵심 성과

| 영역 | 성과 |
| --- | --- |
| API 성능 | AWS EC2 300 VU·5분 조건에서 `/topics` 처리량을 **37.02 → 평균 94.75 req/s**로 약 2.6배 개선 |
| 재현성 | 개선 후 동일 조건으로 3회 반복 측정해 **93.34~95.85 req/s** 범위 확인 |
| 응답 시간 | 300 VU에서 평균 응답 시간을 **7.00초 → 2.14초**로 단축 |
| CI/CD | lint·통합 테스트·typecheck·build와 배포·migration·Nginx 검증·3단계 smoke test 자동화 |
| 보안 | HttpOnly JWT, Double Submit CSRF 검증, Redis 고정 윈도우 Rate Limiting 적용 |
| 트래픽 검증 | Rate Limit의 `429 Too Many Requests`와 `Retry-After` 반환을 통합 테스트와 k6로 검증 |

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, Axios, Recharts |
| Backend | Python, FastAPI, SQLAlchemy, Alembic |
| Data | MySQL, Redis |
| Infra | AWS EC2, Nginx, Docker Compose |
| CI/CD | GitHub Actions |
| Observability | Prometheus, Grafana, CloudWatch |
| Test | Pytest, Ruff, ESLint, k6 |

## 시스템 아키텍처

<img src="assets/readme/architecture.png" width="850" alt="Waggle 시스템 아키텍처" />

## 주요 구현 및 개선 내용

### 1. AWS EC2, Docker Compose, Nginx 기반 운영 환경 구성

로컬 개발 환경에서 동작하던 서비스를 실제 사용자가 접근 가능한 운영 환경으로 구성했습니다.

- AWS EC2 인스턴스에 서비스를 배포하고 Elastic IP와 `waggle.kr` 도메인 연결
- Nginx에서 React 빌드 결과물(`/frontend/dist`) 정적 파일 서빙
- SPA 라우팅을 위해 `try_files $uri $uri/ /index.html` 적용
- `/api`, `/manage-api` 요청을 FastAPI 백엔드(`127.0.0.1:8000`)로 reverse proxy
- FastAPI 백엔드와 MySQL 8.0을 Docker Compose로 실행
- `/api/health`, `/api/health/db`로 배포 후 애플리케이션과 DB 연결 상태 확인

### 2. 관측 지표 기반 `/topics` API 성능 개선

`/topics` 목록 조회에서 댓글 수, 좋아요 수, 투표 결과, pinned 여부를 topic별로 반복 조회하거나 계산하던 흐름을 개선했습니다.

- 댓글 수, 좋아요 수, pinned 여부를 `topic_id` 기준으로 일괄 집계
- 투표 결과와 대댓글 수를 여러 topic 기준으로 한 번에 조회하도록 개선
- `votes(topic_id, vote_index)`, `comments(topic_id, is_deleted)`, `replies(comment_id)` 인덱스 보강
- MySQL Workbench `EXPLAIN`으로 주요 집계 쿼리의 인덱스 사용 여부 확인
- k6 기준 300 VU / 5분 조건에서 처리량을 **37 req/s -> 95 req/s 수준으로 개선**

### 3. GitHub Actions 기반 CI/CD 및 운영 검증 자동화

GitHub Actions를 통해 PR 검증과 main 브랜치 배포 흐름을 자동화했습니다.

- PR 단계에서 backend lint, backend integration test, frontend lint, typecheck, build 실행
- main 브랜치 배포 시 EC2에 SSH 접속 후 최신 코드 반영
- 백엔드 컨테이너 재빌드, Alembic migration, 프론트엔드 빌드, Nginx reload 순서 구성
- `/health`, `/health/db`, `/topics` smoke test로 배포 후 상태 확인
- Markdown 문서 수정은 배포 workflow가 실행되지 않도록 `paths-ignore` 적용

### 4. HttpOnly 쿠키 기반 인증 구조와 CSRF 방어 적용

JWT 인증 정보를 브라우저에 저장할 때 토큰 노출 위험과 쿠키 자동 전송으로 인한 CSRF 위험을 함께 고려했습니다.

- `access_token`, `refresh_token`은 HttpOnly 쿠키에 저장
- 로그인 또는 토큰 갱신 시 `csrf_token` 쿠키 발급
- POST, PUT, PATCH, DELETE 요청마다 `X-CSRF-Token` 헤더 포함
- 서버에서 쿠키의 `csrf_token`과 헤더의 `X-CSRF-Token` 비교
- 누락 또는 불일치 시 `403 CSRF validation failed`로 차단
- CSRF 토큰 누락, 불일치, 정상 요청 흐름을 통합 테스트로 검증

## 핵심 기능

### 1. 토픽 목록 및 투표 카드

- 카테고리별 토픽 목록 조회
- 검색어 기반 토픽 탐색
- 토픽 카드에서 투표 선택지와 현재 투표 비율 확인
- PC/모바일 화면에 맞춘 반응형 카드 구성

<p>
  <img src="assets/readme/main-page.png" width="620" alt="Waggle 메인 페이지" />
</p>

<p>
  <img src="assets/readme/mobile-main.jpg" width="180" alt="Waggle 모바일 메인 페이지" />
</p>

### 2. 토픽 상세 및 투표 결과

- 토픽 상세 내용 확인
- 찬성/반대 투표
- 시간대별 투표 비율 차트 제공
- 댓글과 답글을 통한 의견 교환

<p>
  <img src="assets/readme/topic-detail.png" width="620" alt="Waggle 토픽 상세 페이지" />
</p>

<p>
  <img src="assets/readme/mobile-topic-detail.jpg" width="180" alt="Waggle 모바일 토픽 상세 페이지" />
</p>

### 3. 토픽 생성

- 제목, 설명, 카테고리 입력
- 서비스 정책에 맞춘 2개 투표 선택지 구성
- 사용자가 쉽게 토픽을 작성할 수 있는 입력 흐름 제공

<img src="assets/readme/create-topic.png" width="800" alt="Waggle 토픽 생성 페이지" />

### 4. 프로필 및 사용자 활동

- 계정 정보 확인
- 사용자가 작성한 토픽과 댓글 확인
- 문의 처리 결과 확인

<img src="assets/readme/profile-page.png" width="800" alt="Waggle 프로필 페이지" />

### 5. 관리자 운영 기능

- 문의 처리 상태 관리
- 토픽/댓글 관리
- 관리자 조치 이력과 감사 로그 확인
- 삭제 전 주요 정보와 조치 사유 추적
- 마감된 토픽의 작성자, 투표 참여자, 북마크 사용자에게 결과 확인 알림 발송

마감 토픽 알림은 관리자 API로 실행합니다. 운영 환경에서는 이 엔드포인트를 cron 또는 배치 작업에 연결해 주기적으로 호출합니다.

```bash
POST /manage-api/notifications/topic-close/dispatch
```

<img src="assets/readme/admin-dashboard.png" width="800" alt="Waggle 관리자 운영 대시보드" />

<img src="assets/readme/admin-audit-log.png" width="800" alt="Waggle 감사 로그 화면" />

## 실행 방법

### 1. 프로젝트 클론

```bash
git clone https://github.com/SECHANG1412/Waggle-Service.git
cd Waggle-Service
```

### 2. 환경 변수 설정

```bash
cp backend/.env.example backend/.env.local
cp frontend/.env.example frontend/.env.local
```

필요한 값을 로컬 환경에 맞게 수정합니다.

### 3. Docker Compose 실행

```bash
docker compose up -d --build
```

기본 접속 주소:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- MySQL: `localhost:3307`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`

### 4. DB 마이그레이션

```bash
docker compose exec backend alembic upgrade head
docker compose restart backend
```

### 5. 로컬 개발 서버 실행

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
pip install -r requirements-dev.txt
uvicorn main:app --reload
```

## 테스트

### Backend

```bash
cd backend
pytest -q tests/integration
ruff check app main.py tests
```

### Frontend

```bash
cd frontend
npm run lint
npm run typecheck
npm run build
```

### k6 부하 테스트

```bash
k6 run k6/topics-list-smoke.js
k6 run k6/topics-list-upper-load.js
```

## 향후 개선 계획

- 운영 환경 기준의 성능 테스트 시나리오와 결과 기록 체계 보강
- Prometheus/Grafana 기반 알림 규칙 추가
- GitHub Actions 배포 실패 원인 분류와 알림 흐름 개선
- 관리자 운영 기능의 검색/필터링 사용성 개선
