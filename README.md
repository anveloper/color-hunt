# 컬러헌트 (Color Hunt)

여행/일상에서 단색 사진을 모아 9컷 그리드로 합성·공유하는 모바일 웹 앱.

순수 프론트엔드 SPA — 모든 처리는 브라우저 내에서 이루어지며 사진은 서버로 전송되지 않습니다.

## 개발

```bash
pnpm install
pnpm run dev
```

## 빌드

```bash
pnpm run build
pnpm run preview
```

## 배포

Vercel에 GitHub repo를 연결하면 `main` 브랜치 푸시 시 자동 배포됩니다.

## 문서

- [기획서](./docs/PRD.md)

## 스택

- React 19 + Vite 6 + TypeScript
- Tailwind CSS v4
- React Router v7
- @use-gesture/react
