# 컬러헌트 (Color Hunt) — 기획서

## 1. 프로젝트 개요

### 1.1 컨셉
"컬러헌트(Color Hunt)"는 최근 유행하는 소셜 활동을 디지털로 옮긴 **순수 프론트엔드 앱**이다. 같은 번들을 웹(`color-hunt.run`)과 **앱인토스 미니앱(`컬러헌트런` / `color-hunt-run`)** 두 타깃으로 배포한다.

> **컬러헌트란?**
> 팀 또는 개인이 여행/일상을 다니며 **지정된 한 가지 색상이 80% 이상 차지하는 사진**을 모아, 9컷(또는 다른 그리드) 콜라주로 배치하여 인스타그램과 같은 세로형 소셜 미디어에 공유하는 활동.

본 앱은 사용자가 모바일로 접속해 사진을 그리드에 배치하고, 하나의 이미지로 다운로드해 SNS에 공유할 수 있도록 돕는다.

### 1.2 핵심 가치
- **서버리스**: 사용자의 사진과 위치 좌표는 어떠한 서버에도 업로드되지 않는다. 모든 처리는 기기 안에서 이루어지며 상태는 LocalStorage로 보존된다.
- **모바일 퍼스트**: PC로 접속하더라도 모바일 뷰포트로 강제 렌더링한다.
- **가볍고 직관적인 UX**: 온보딩(색 정하기) → 그리드(수집·편집) → 꾸미기 → 저장.
- **개성 있는 비주얼**: 온보딩은 Excalidraw 스타일(손으로 그린 느낌)의 타이포/버튼. 편집 화면은 TDS(토스 디자인 시스템) 컴포넌트가 섞인다.

### 1.3 비범위(Out of Scope)
- 회원가입, 로그인, 백엔드 API
- 사진의 색상 분석/검증(80% 색상 충족 여부 자동 판정)
- 소셜 공유 기능 직접 통합(다운로드 후 사용자가 직접 업로드)
- 데스크톱 전용 레이아웃

---

## 2. 사용자 플로우

```
[온보딩]                        [그리드 / 편집]
"컬러헌트"                       레이아웃대로 셀 배치
오늘의 색 7색 중 선택            + 플로팅 독
  또는 "랜덤으로 정하기"           ├ 기록 (시작 / 종료·경과시간)
        │                          ├ 꾸미기 (기록이 있고 정지 상태일 때만)
   [시작하기]                      ├ 스타일 (레이아웃 / 그리드선 메뉴)
   [이어하기] ─┬─ /hunt            └ 저장 (비율 선택 메뉴)
   [지우고     │
    다시하기] ─┘  (확인 모달)

   각 셀:
     - 빈 셀 1탭 → 웹: 파일 피커 / 미니앱: "앨범에서 고르기 · 사진 찍기" 바텀시트
     - 채워진 셀 1탭 → 편집(핀치 줌·회전 / 드래그 이동, 재업로드·삭제)

[꾸미기 모드]  기록을 끝내면 자동 진입
     - 경로 / 시간 / 색 요소를 켜고 끈다
     - 요소 탭 = 선택, 끌기·핀치로 배치, 다시 탭 = 강조 방식 순환
     - 껐다 켜면 원위치
```

### 2.1 페이지 구성
| 페이지 | 경로 | 설명 |
|---|---|---|
| 온보딩 | `/` | "컬러헌트" 타이틀 + "시작하기" 버튼 |
| 그리드 | `/hunt` | 그리드 편집 화면 + 플로팅 독 |

---

## 3. 기능 명세

### 3.1 온보딩 페이지
- **타이틀**: "컬러헌트" (스타일 손글씨 폰트)
- **버튼**: "시작하기" (연필로 그린 듯한 거친 외곽선)
- **클릭 시**: `/hunt`로 이동
- **스타일 레퍼런스**:
  - 폰트: Gaegu (한글 손글씨). 셀프 호스팅 서브셋
  - 외곽선: SVG roughjs 스타일(거친 라인)
  - 배경: 종이 질감 또는 오프-화이트(#FAF8F3)

### 3.2 그리드 편집 페이지

#### 3.2.1 그리드 레이아웃
디바이스 화면 비율(가로:세로)에 그리드를 가득 채워 배치한다. 사진 한 장을 그리드 셀로 자른 듯한 느낌을 위해 **셀 사이 간격(gutter)은 0**, 그리드 선은 오버레이로 그린다.

| 레이아웃 | 열x행 | 셀 개수 | 비고 |
|---|---|---|---|
| 3x3 | 3 x 3 | 9 | **기본값** |
| 3x4 | 3 x 4 | 12 | 인스타 9컷 + 추가 |
| 2x3 | 2 x 3 | 6 | 6컷 |
| 2x2 | 2 x 2 | 4 | 빠른 미니 콜라주 |
| 1x3 | 1 x 3 | 3 | 스토리/세로 띠 |

> 사용자 표기 "3x4 / 2x3 / 2x2 / 1x3"은 **열 x 행** 기준으로 해석한다. (3x3 = 9칸, 3x4 = 12칸, 2x3 = 6칸, 2x2 = 4칸, 1x3 = 3칸)

#### 3.2.2 셀 인터랙션
- **빈 셀 1탭**: OS 파일 피커(`<input type="file" accept="image/*">`)를 띄워 이미지 선택. 선택 즉시 셀에 채워진다(`object-fit: cover`).
- **이미지가 있는 셀 1탭**: 편집 모드 진입(셀이 강조되고 배경이 어두워짐).
  - 1손가락 드래그 = 이동(팬)
  - 2손가락 핀치 = 확대/축소 + 회전(기울이기)
  - 하단 독: `재업로드` / `삭제` / `완료`
  - 빈 영역(어두운 배경) 탭 또는 `완료` 버튼으로 편집 종료
  - `재업로드`: 새 이미지로 교체하면 transform 리셋
  - `삭제`: 이미지 + transform 제거 후 빈 셀로 복원
- 그리드 페이지 일반 상태에서는 단일 손가락 제스처는 셀 탭으로만 처리(스크롤/줌 충돌 없음 — 페이지 자체가 풀스크린).

#### 3.2.3 플로팅 독(Floating Dock)
화면 하단에 고정. 상태에 따라 **최대 4개**만 노출한다(폭이 넘치지 않도록).

| 상태 | 버튼 |
|---|---|
| 기록 없음 | 기록 / 스타일 / 저장 |
| 기록 있음 | 기록 / 꾸미기 / 스타일 / 저장 |
| 기록 중 | (경과시간) / 스타일 / 저장 |
| 꾸미기 모드 | 경로 / 시간 / 색 / 완료 |

1. **기록**: 런 세션을 시작·종료한다. 진행 중에는 경과 시간(`12:34`)을 표시하고 누르면 종료된다. 종료 시 꾸미기 모드로 자동 진입한다. 위치 권한을 거부하면 시작하지 않고, 나머지 기능은 그대로 쓴다.
2. **꾸미기**: 오버레이 배치 모드로 들어간다. 기록이 있고 진행 중이 아닐 때만 보인다.
3. **스타일**: 팝오버 메뉴에서 레이아웃 5종과 그리드 선 3종을 **직접 선택**한다(순환 아님).
4. **저장**: 팝오버 메뉴에서 비율을 골라 PNG로 합성·저장한다.
   - 웹: `canvas.toBlob` → `<a download>`
   - 미니앱: `File.saveBase64` (웹뷰에서는 `<a download>`가 동작하지 않는다)

> 전체 초기화는 독이 아니라 온보딩의 "지우고 다시하기"에 있다(TDS `ConfirmDialog`로 확인).

#### 3.2.4 다운로드 이미지 사양
- 해상도: **짧은 변** 1080px 기준. 가로형이면 높이가 1080이 된다.
- 비율: 저장 시 5종 중 선택 — `현재 화면` / `1:1` / `4:5` / `9:16` / `16:9`
- 포맷: PNG. 배경은 투명이 아니라 종이색 `#f6f1e3`으로 채운다.
- 그리드 선: 선택한 색상으로 2px 오버레이
- 오버레이(경로·시간·색)는 화면에서 배치한 그대로 함께 그린다. 런 기록이 없으면 그리지 않는다.

**스냅샷 합성**: `현재 화면`을 고르면 실제 셀 DOM의 `getBoundingClientRect()`를 떠서 화면에 보이는 위치를 그대로 결과물에 옮긴다(`data-cell-index` 활용). 나머지 비율은 레이아웃 격자를 균등 분할한다.

---

## 4. 모바일 전용 정책

- 뷰포트 메타: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`
- 데스크톱(`min-width: 769px`)에서 접속 시: 중앙에 9:16 프레임을 띄우고 그 안에 앱을 렌더한다. 프레임 바깥은 어둡게(`#1f1d1b`) 처리한다. (안내 문구와 QR코드는 미구현.)
- 터치 제스처 충돌 방지: 셀은 `touch-action: manipulation`, 편집기·오버레이 레이어는 `touch-action: none`.
- 하단 독은 `env(safe-area-inset-bottom)`으로 홈 인디케이터를 피한다.
- 미니앱에서는 `webView` 설정으로 바운스·오버스크롤·당겨서 새로고침을 끈다. 전체 화면 그리드라 스크롤이 없고, 허용하면 프레임 바깥이 드러난다.

---

## 5. 데이터 모델 (LocalStorage)

### 5.1 키 목록

| 키 | 용도 |
|---|---|
| `colorhunt:state:v1` | 앱 상태 전체 |
| `colorhunt:hint:edit-seen-v1` | 셀 편집 도움말 1회 노출 플래그 |
| `colorhunt:hint:decorate-seen-v1` | 꾸미기 도움말 1회 노출 플래그 |

### 5.2 스키마

```ts
type Layout = "3x3" | "3x4" | "2x3" | "2x2" | "1x3";
type GridLineMode = "white" | "black" | "none";

type Transform = {
  scale: number;     // 1.0 = cover 기본
  offsetX: number;   // 기준 크기 대비 비율 (셀 또는 프레임)
  offsetY: number;
  rotation: number;  // degrees
};

type CellState = {
  id: string;
  imageDataUrl?: string; // base64 JPEG
  transform?: Transform;
};

// 런 기록 — 좌표는 기기 밖으로 나가지 않는다
type TrackPoint = { lat: number; lng: number; t: number };

type RunRecord = {
  startedAt: number;
  endedAt?: number;                                  // 진행 중이면 undefined
  points: TrackPoint[];
  spots: { cellIndex: number; point: TrackPoint }[]; // 사진을 넣은 지점
};

// 콜라주 위에 얹는 요소
type OverlayKind = "course" | "runtime" | "color";
type OverlayEmphasis = "shadow" | "outline" | "plate";

type OverlayAsset = {
  kind: OverlayKind;
  visible: boolean;
  emphasis: OverlayEmphasis;
  transform: Transform;
};

type AppState = {
  layout: Layout;
  huntColor: string;          // palette.ts의 HuntColor id
  gridLineMode: GridLineMode;
  cells: CellState[];
  overflowCells: CellState[]; // 레이아웃 축소 시 초과분 (같은 키 안에 보관)
  run?: RunRecord;
  overlays: OverlayAsset[];
};
```

### 5.3 마이그레이션 규약

키 버전을 올리지 않고 **필드 단위로 이관**한다. 구버전 저장값에서 로드해도 사진이 유실되지 않아야 하기 때문이다.

- 없는 필드는 `??`로 기본값을 채운다 (`huntColor`, `overlays`, `run`).
- `migrateOverlays()`가 `emphasis` 누락분을 `shadow`로 채우고, 오버레이 기본 오프셋을 옛 값(`LEGACY_DEFAULT_OFFSET`)에서 새 값으로 옮긴다. **사용자가 직접 옮긴 배치는 건드리지 않는다** — 저장값이 손대지 않은 옛 기본값과 정확히 일치할 때만 이관한다.
- `loadState()`가 예외를 만나면 `DEFAULT_STATE`로 떨어진다. 즉 파싱 실패는 곧 사진 전량 소실이므로, 스키마를 바꿀 때는 항상 이 경로를 피하도록 설계한다.

### 5.4 용량 한계 (R1 참조)

- 사진을 base64로 저장하므로 LocalStorage 한도(보통 5MB)에 쉽게 닿는다.
- 업로드 시 `<canvas>`로 리사이즈한다 — **긴 변** 최대 1080px, JPEG 0.85. 저장 결과물이 짧은 변 1080 기준이라 원본을 그보다 크게 들 이유가 없다.
- 실측 예산은 약 5.0M 문자(Chrome·Safari 동일, base64는 ASCII라 1자=1바이트). 사진 1장이 중앙값 180KB, 상위 10% 270KB 수준이라 12컷 최악 조합이 약 88%다.
- 앱인토스 앨범 경로는 상한이 하나 더 있다. 브릿지로 오가는 base64 payload가 크면 웹뷰가 메모리로 죽기 때문에 `maxWidth 720`, `maxCount 9`로 제한한다.
- `run.points`가 3초/5m 간격으로 **상한 없이 누적**된다. 같은 키에 들어가므로 런이 길어질수록 한도가 빨리 온다.
- 저장 실패(`QuotaExceededError`)는 토스트로 사용자에게 알린다. 조용히 넘기면 다음 진입에서 마지막으로 성공한 시점으로 되돌아간다.

---

## 6. 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | React 19 + Vite 6 | SPA |
| 언어 | TypeScript ~5.7 | |
| 스타일 | Tailwind v4 | `@tailwindcss/vite` |
| 라우팅 | React Router 7 | `/`, `/hunt` 2개 |
| 상태 | `useState` + `useEffect`로 LocalStorage 직접 동기화 | Context 미사용 |
| 제스처 | `@use-gesture/react` | 셀 편집·오버레이 배치 공용 |
| 손글씨 UI | SVG `feTurbulence` + `feDisplacementMap` 필터 | rough.js 미사용 |
| 폰트 | Gaegu 서브셋 셀프 호스팅 | `scripts/build-fonts.mjs`, 400/700 |
| 이미지 합성 | HTML Canvas | |
| HEIC 변환 | `heic-to` | 동적 import |
| 미니앱 | `@apps-in-toss/web-framework` | `@apps-in-toss/devtools` vite 플러그인 |
| 디자인 시스템 | `@toss/tds-mobile` + `@toss/tds-mobile-ait` | `@emotion/react` 필요 |
| 패키지 매니저 | pnpm 10.33 | |
| 배포 (웹) | Vercel, `main` 푸시 시 자동 | `vercel.json` SPA 리라이트 필수 |
| 배포 (미니앱) | `pnpm build:ait` → 콘솔 업로드 또는 `ait deploy` | `.ait` 번들 |

### 6.1 빌드 스크립트

| 명령 | 하는 일 |
|---|---|
| `pnpm dev` | 개발 서버 |
| `pnpm build` | `tsc -b && vite build` (웹 배포용) |
| `pnpm build:ait` | 위 + `ait build` → `color-hunt-run.ait` |
| `pnpm lint` | 타입 검사만 |
| `pnpm fonts` | 소스에서 쓰는 글자만 뽑아 Gaegu 서브셋 재생성 |
| `pnpm deploy` | `ait deploy` |

> `build`에 `ait build`를 붙이지 않는다. Vercel 웹 배포에는 불필요하고, 실패하면 웹 배포까지 같이 죽는다.

> **한글 문구를 추가·수정하면 `pnpm fonts`를 다시 돌려야 한다.** 안 돌리면 새 글자가 두부로 보인다.

---

## 7. 디렉토리 구조

파일명은 kebab-case를 쓴다.

```
color-hunt/
├── apps-in-toss.config.ts      # 미니앱 설정 (appName, 권한, webView)
├── vercel.json                 # SPA 리라이트 — 없으면 /hunt 새로고침이 404
├── scripts/
│   └── build-fonts.mjs         # Gaegu 서브셋 생성
├── docs/
│   ├── PRD.md
│   ├── brand-assets-brief.md
│   └── prompts/
├── public/
│   ├── fonts/gaegu-{400,700}.woff2   # 자동 생성
│   ├── favicon-{32,192}.png, apple-touch-icon.png, favicon.png
│   ├── logo.png, og.png
│   └── robots.txt, sitemap.xml
├── src/
│   ├── main.tsx                # TDS Provider + ErrorBoundary + Router
│   ├── types.ts
│   ├── routes/
│   │   ├── onboarding.tsx      # 오늘의 색 선택, 이어하기/지우고 다시하기
│   │   └── hunt.tsx            # 그리드, 런 기록, 꾸미기 모드
│   ├── components/
│   │   ├── app-shell.tsx
│   │   ├── grid-board.tsx
│   │   ├── grid-cell.tsx
│   │   ├── cell-editor.tsx     # 핀치/팬 편집 오버레이
│   │   ├── floating-dock.tsx   # 기록 / 꾸미기 / 스타일 / 저장
│   │   ├── overlay-layer.tsx   # 경로·시간·색 배치
│   │   ├── overlay-dock.tsx    # 꾸미기 모드 전용 독
│   │   ├── tap-button.tsx      # div 기반 버튼 (R6 참조)
│   │   └── error-boundary.tsx
│   ├── hooks/
│   │   └── use-run-tracker.ts  # 위치 구독 + 경과 시간 티커
│   ├── lib/
│   │   ├── storage.ts          # LocalStorage 로드/저장/마이그레이션
│   │   ├── palette.ts          # 오늘의 색 7종
│   │   ├── layout-utils.ts
│   │   ├── transform.ts
│   │   ├── image.ts            # 리사이즈/인코딩, HEIC 변환
│   │   ├── compose.ts          # 캔버스 합성 + 저장
│   │   ├── overlay.ts          # 오버레이 상수·경로 정규화·시간 포맷
│   │   ├── location.ts         # 위치 구독 (토스/웹 분기)
│   │   └── toss.ts             # 앱인토스 SDK 접점
│   └── styles/
│       ├── index.css
│       └── fonts.css           # 자동 생성
└── index.html
```

`color-hunt-run.ait`는 로컬 빌드 산출물이며 git에 올리지 않는다(`.gitignore`).

### 7.1 플랫폼 분기

`isInToss()`(`window.ReactNativeWebView` 존재 여부)로 갈라지는 지점.

| | 웹 | 미니앱 |
|---|---|---|
| 사진 입력 | `<input type="file">` | 앨범/카메라 선택 시트 → `Device.getPhotos` / `Device.openCamera` |
| 저장 | `<a download>` | `File.saveBase64` |
| 위치 | `navigator.geolocation.watchPosition` | `Device.subscribeLocation` |
| GitHub 링크 | 노출 | 숨김 (심사 기준상 자사 유도 금지) |

### 7.2 화면 ↔ 저장물 일치 규약

`overlay-layer.tsx`(SVG)와 `compose.ts`(캔버스)는 **같은 좌표계와 변환 순서**를 써야 화면에서 배치한 것과 저장된 이미지가 일치한다.

- 변환 순서: 중앙 → 비율 오프셋 → 회전 → 확대
- 좌표계·색 상수는 `lib/overlay.ts`의 `COURSE_MARK`, `EMPHASIS_STYLE`에 모아두고 양쪽이 참조한다. 한쪽에만 값을 적으면 조용히 어긋난다.
- 오버레이는 화면 프레임 픽셀 기준으로 배치되므로, 저장 시 `targetWidth / 화면 프레임 폭`으로 환산해야 한다. 이 기준을 비율 숫자로 착각하면 배율이 수백 배로 튄다.

---

## 8. 마일스톤

### 완료
- **M1** 스캐폴드 & 배포 파이프라인 — Vite + React + TS, Vercel 자동 배포, 라우팅
- **M2** 온보딩 + 빈 그리드
- **M3** 이미지 업로드 & 표시 — 리사이즈/인코딩, LocalStorage 영속화
- **M4** 핀치/팬 편집
- **M5** 그리드 선 + 레이아웃 전환 (이후 스타일 메뉴로 통합)
- **M6** 다운로드(캔버스 합성) — 비율 5종, 스냅샷 기반
- **M8** 앱인토스 미니앱 — 웹뷰 연동, 앨범/카메라, 기기 저장, 권한 3종, 심사 대응(TDS 모달·폰트 셀프호스팅·외부 링크 제거)
- **M9** 런 기록 — 위치 구독, 경로 정규화, 사진 지점
- **M10** 오버레이 / 꾸미기 모드 — 경로·시간·색 자유 배치, 강조 3종, 저장물 반영
- **M11** 폰트 서브셋 파이프라인

### 부분 완료
- **M7** 폴리시 — 메타태그/OG/JSON-LD는 완료. **PC 안내 문구·QR, PWA는 미착수.**

---

## 9. 위험 요소 & 결정 필요 사항

### 열린 위험

| # | 항목 | 상태 |
|---|---|---|
| R1 | **LocalStorage 5MB 한도** | **악화.** 사진 base64에 더해 `run.points`가 상한 없이 누적된다. 리사이즈로 완화 중이고 IndexedDB 이관은 미착수. 저장 실패는 토스트로 알리지만 근본 해결은 아니다. 좌표 샘플링/상한 정책이 필요하다. |
| R2 | iOS Safari `<a download>` 제약 | **절반 해결.** 미니앱은 `File.saveBase64`로 우회했으나, 웹 사파리용 새 탭 폴백·Web Share API는 미구현. |
| R6 | **TDS 전역 리셋 vs Tailwind 레이어** | TDS가 emotion Global로 `button` 스타일을 주입하는데, Tailwind 유틸리티는 `@layer utilities` 안에 있어 specificity와 무관하게 진다. 그래서 앱 자체 버튼은 `<button>` 대신 `TapButton`(div + role)을 쓴다. **새 버튼을 만들 때마다 재발할 수 있다.** |
| R7 | 폰트 서브셋 갱신 누락 | 한글 문구를 추가하고 `pnpm fonts`를 안 돌리면 새 글자가 두부로 보인다. |
| R8 | 앱인토스 심사 정책 | 미니앱에서 자사 서비스 유도 링크 금지, 권한 요청 전 사유 고지 필요, 라이트 모드 강제 등. 정책은 계속 갱신된다. |
| R9 | 브릿지 base64 payload로 인한 웹뷰 OOM | 앨범에서 여러 장을 큰 해상도로 받으면 앱이 재시작된다. `maxWidth 720` / `maxCount 9`로 억제 중. 저장 시 넘기는 PNG data URL도 같은 성격의 위험이다. |

### 해결됨

| # | 항목 | 처리 |
|---|---|---|
| R3 | 고해상도 합성 메모리 | 짧은 변 1080 기준으로 고정 |
| R4 | 핀치 제스처와 브라우저 줌 충돌 | `maximum-scale=1, user-scalable=no` + `touch-action` |
| R5 | 길게 누르기 액션 메뉴 | **설계 변경으로 폐기.** 셀 탭 → 편집기 하단 독(재업로드/삭제/완료)으로 대체 |
| R10 | 위치 권한 거부 | 거부해도 그리드 기능은 그대로 동작한다. 요청 전 동의 시트로 사유를 먼저 알린다. |

---

## 10. 향후 확장 아이디어 (v2+)
- 색상 헌팅 챌린지: 선택한 헌팅 색상에 맞춰 사진의 색 비율 자동 검증(클라이언트 색상 분석)
- 팀 모드: URL 공유로 같은 그리드를 협업 편집(WebRTC 또는 추후 백엔드 도입 검토)
- 템플릿/프리셋 — **부분 구현**(오늘의 색 7종 + 랜덤). 파스텔/모노톤 같은 테마 묶음은 미구현
- 그리드별 캡션/해시태그 자동 생성

---

*Last updated: 2026-08-23*
