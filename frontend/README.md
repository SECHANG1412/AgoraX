# Waggle Frontend

React와 Vite 기반으로 구현한 Waggle 프론트엔드입니다.

## 주요 역할

- 토픽 목록, 토픽 상세, 투표, 댓글/답글 화면 제공
- 일반 로그인 및 OAuth 로그인 화면 제공
- CSRF 토큰을 읽어 상태 변경 요청에 `X-CSRF-Token` 헤더 자동 첨부
- 관리자 계정 전용 `/manage` 화면 제공
- 문의 작성, 프로필 문의 내역, 숨김 콘텐츠 상태 확인 화면 제공
- 모바일 Navbar, 토픽 카드, 댓글, 프로필, 관리자 화면 반응형 대응

## 기술 스택

- React 19
- Vite 7
- React Router
- Axios
- Tailwind CSS
- Recharts
- Radix UI Dialog
- ESLint

## 실행 방법

```bash
npm ci
npm run dev
```

개발 서버 기본 주소는 `http://localhost:3000`입니다.

`package-lock.json`을 기준으로 재현 가능한 의존성을 설치하기 위해 로컬 개발과 CI 모두 `npm ci`를 사용합니다. 의존성을 추가하거나 갱신하여 잠금 파일을 변경해야 할 때만 `npm install`을 사용합니다.

## 검증

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

`npm run test`는 관리자 대시보드의 API 부분 실패 처리와 인증·관리자 경로 접근 제어를 회귀 검증합니다. API 응답은 테스트에서 대역하므로 백엔드나 외부 서비스 연결이 필요하지 않습니다.

CI에서는 프론트엔드 lint, TypeScript 타입 검사와 production build 가능 여부를 확인합니다.
