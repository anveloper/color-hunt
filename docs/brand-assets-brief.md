# 컬러헌트 브랜드 자산 준비 문서

## 1. 현재 프로젝트/디자인 분석

### 제품 성격
- 컬러헌트는 여행/일상에서 특정 색이 크게 차지하는 사진을 모아 그리드 콜라주로 공유하는 모바일 우선 앱이다.
- 핵심 경험은 `색을 고르고`, `사진을 모으고`, `그리드로 정리해서`, `SNS용 결과물로 저장하는 것`이다.
- 서버리스, 가벼움, 즉시성, 소셜 놀이감이 브랜드의 중심이다.

### 현재 UI 톤
- 바탕은 종이 질감이 느껴지는 오프 화이트 계열이다.
- 타이포는 `Gaegu` 손글씨 톤이다. (`Caveat`는 초기 검토만 하고 쓰지 않는다.)
- Gaegu는 CDN이 아니라 **앱에서 실제 쓰는 글자만 담은 서브셋을 셀프 호스팅**한다(`public/fonts/gaegu-{400,700}.woff2`, 약 520자·합계 100KB). 새 한글 문구를 넣으면 `pnpm run fonts`로 서브셋을 다시 만들어야 하므로, **문구를 자산에 박아 넣는 결정은 폰트 파이프라인과 얽힌다.**
- 컬러는 색연필처럼 약간 탁하고 따뜻한 원색을 쓴다.
- SVG turbulence/displacement 필터로 손으로 그린 듯한 흔들림을 만든다.
- 온보딩은 장난스럽고 아날로그적이지만, 실제 편집 화면은 비교적 미니멀하다.
- 앱인토스 미니앱 대응으로 TDS(토스 디자인 시스템)를 도입하면서 **손그림 톤은 온보딩에, TDS 톤은 편집 화면(바텀시트·다이얼로그)에** 남는 이원 구조가 됐다. 브랜드 일관성 관점에서 판단이 필요한 지점이다.

### 코드에서 확인한 핵심 비주얼 토큰
- 배경 종이색: `#f6f1e3` (앱 프레임 안)
- 프레임 바깥(PC 뷰) 배경: `#1f1d1b` — **어두운 배경 위에서도 로고/OG가 읽히는지 확인해야 한다**
- 잉크색: `#2b2a26`
- 포인트 팔레트:
  - red `#d9534f`
  - orange `#e89b5a`
  - yellow `#e8c547`
  - green `#6aa84f`
  - teal `#3fa9a0`
  - blue `#5c6bc0`
  - purple `#8e6ab0`
- 현재 타이틀은 각 글자를 다른 색으로 칠한 손글씨 워드마크다.
- 그리드는 기능적으로 중요하며, 브랜드 심볼 후보로 적합하다.

### 지금 상태에서 중요한 해석
- 이 앱의 브랜드는 “정교한 디자인 툴”보다 “색을 수집하는 놀이”에 가깝다.
- 따라서 로고/파비콘/OG는 모두 너무 앱스러운 테크 톤보다 `색연필`, `종이`, `손그림`, `격자`, `수집` 쪽에 무게를 두는 편이 맞다.
- 다만 실제 UI는 상당히 절제되어 있으므로, 자산은 지나치게 유아적이기보다 `귀엽지만 정돈된` 방향이 적합하다.

## 2. 권장 브랜드 방향

### 브랜드 키워드
- playful
- analog
- crafty
- social
- color-first
- grid-based

### 시각 방향 한 줄 정의
- `색연필로 채운 손그림 그리드 콜라주 도구`

### 확정 방향
- 메인 브랜드 마크는 `ㅋㄹㅎㅌ` 손글씨 축약 로고로 간다.
- `컬러헌트` 풀네임은 보조 워드마크 또는 OG/설명 문구에서만 사용한다.
- 즉, 브랜드 인지 장치는 짧고 리드미컬한 `ㅋㄹㅎㅌ`, 서비스 설명은 `컬러헌트`가 맡는 이원 구조로 간다.

### 피해야 할 방향
- 너무 테크 스타트업 같은 그라디언트 로고
- 지나치게 플랫한 SaaS 아이콘
- 과하게 아동용처럼 보이는 캐릭터 중심 그래픽
- 사진 편집 앱처럼 보이는 카메라/셔터/렌즈 중심 심볼

## 3. 자산 시스템 제안

### 로고
- 1순위: `ㅋㄹㅎㅌ` 손글씨 축약 로고
- 2순위: 보조 텍스트 `컬러헌트`
- 추천 구조: 네 자음을 리듬감 있게 배치한 손글씨 마크 + 약한 그리드 모티프
- 추천 인상: 각 자음이 색연필로 빠르게 쓴 듯 조금씩 다른 기울기와 두께를 가짐
- 배경: 투명 또는 종이색 배경 버전 둘 다 필요
- 핵심 조건: 작은 크기에서도 네 글자가 하나의 브랜드 리듬으로 읽혀야 함

### 파비콘
- `ㅋㄹㅎㅌ` 전체를 그대로 넣기보다 축약 로고의 리듬을 정사각 심볼로 압축하는 편이 적합
- 추천 심볼 우선순위:
  1. `ㅋㄹㅎㅌ`의 네 획감을 4개의 손그린 기호처럼 배치한 심볼
  2. 3x3 그리드 안에 네 자음의 리듬을 암시하는 미니 아이콘
  3. `ㅋ` 또는 `ㅎ` 일부 형태를 추상화한 정사각 마크
- 16px, 32px에서도 살아야 하므로 선 수를 줄이고 대비를 높여야 함

### OG 이미지
- 목적은 링크 공유 시 앱의 사용 맥락을 한눈에 전달하는 것
- 추천 구성:
  - 종이 배경 위에 모바일 프레임 또는 콜라주 카드
  - 3x3 컬러 사진 그리드가 중심
  - 상단 또는 좌측에 `ㅋㄹㅎㅌ` 메인 마크
  - 필요하면 보조 텍스트로 `컬러헌트`
  - 보조 문구는 짧게: `색을 모으고, 그리드에 담다`
- OG는 로고 단독보다 “어떤 앱인지”를 보여주는 설명형 비주얼이어야 한다.

## 4. 자산 규격

### 채택된 산출물 (실제 파일)

| 파일 | 용도 | 참조 위치 |
|---|---|---|
| `public/logo.png` | 로고 | `README.md` |
| `public/og.png` | OG / Twitter 카드 (1200x630) | `index.html` og:image, twitter:image |
| `public/favicon.png` | 파비콘 원본 | — |
| `public/favicon-32.png` | 파비콘 32x32 | `index.html` |
| `public/favicon-192.png` | 파비콘 192x192 | `index.html` |
| `public/apple-touch-icon.png` | iOS 홈 화면 | `index.html` |

미니앱 아이콘은 레포가 아니라 앱인토스 콘솔에 업로드되어 있다(`static.toss.im` 호스팅).

### 아직 만들지 않은 변형
- 투명 배경 로고
- 심볼형 정사각 로고
- `ㅋㄹㅎㅌ` + `컬러헌트` 락업형
- SVG 재작업

### 생성 시 지킬 것
- 파비콘은 정사각 원본 1024x1024로 먼저 만들고 축소 파생한다. 라인이 얇으면 작은 크기에서 뭉개진다.
- OG는 텍스트와 핵심 피사체를 중앙 80% 안에 두고, 디테일보다 작은 썸네일에서 읽히는 실루엣을 우선한다.

## 5. Image 2.0 생성 전략

### 생성 순서
1. 로고 방향 탐색 3안
2. 선택한 로고 방향에서 파비콘 심볼 파생 2안
3. 확정된 로고/심볼을 바탕으로 OG 이미지 생성

### 공통 제약
- 손그림 느낌은 유지하되 전체 실루엣은 깔끔해야 함
- 실제 앱 색상 토큰에서 크게 벗어나지 말 것
- 텍스트가 들어가면 반드시 짧게
- 워터마크, 랜덤 문구, 사진 같은 배경 노이즈 금지
- 메인 생성 대상은 `ㅋㄹㅎㅌ`로 좁힌다
- 한국어 텍스트 정확도 이슈를 줄이기 위해 풀네임 `컬러헌트`는 보조 요소로만 제한한다

## 6. Image 2.0 프롬프트 초안

### A. 로고 탐색 프롬프트

```text
Use case: logo-brand
Asset type: app logo exploration
Primary request: create a playful but tidy handwritten Korean consonant logo for a mobile web app called Color Hunt, using the shorthand ㅋㄹㅎㅌ as the main brand mark for a social activity where people collect photos dominated by one color and arrange them into a grid collage
Scene/backdrop: plain paper-like off-white background
Subject: hand-drawn shorthand logo "ㅋㄹㅎㅌ" with a subtle 3x3 grid motif
Style/medium: pencil crayon, handwritten Korean consonant branding, polished editorial logo concept, vector-friendly silhouette
Composition/framing: centered composition, logo only, generous negative space
Lighting/mood: flat clean presentation, warm and friendly
Color palette: off-white paper, charcoal ink, muted pencil red, orange, yellow, green, teal, blue
Materials/textures: light paper grain, soft colored pencil fill, slightly imperfect hand-drawn outline
Text (verbatim): "ㅋㄹㅎㅌ"
Constraints: legible at small size, must feel rhythmic and memorable, no camera icon, no glossy tech gradient, no mascot, no watermark
Avoid: photorealism, 3D mockup, UI screenshot, overly childish illustration
```

### B. 조합형 로고 프롬프트

```text
Use case: logo-brand
Asset type: Korean lockup exploration
Primary request: create a warm hand-drawn Korean logo lockup using ㅋㄹㅎㅌ as the main shorthand mark and 컬러헌트 as a small supporting label, representing collecting colors and arranging them into a social grid collage
Scene/backdrop: plain paper-like off-white background
Subject: the handwritten shorthand mark "ㅋㄹㅎㅌ" as the hero, with the supporting Korean text "컬러헌트" placed smaller underneath or beside it
Style/medium: hand-drawn logo, colored pencil lettering, clean brand presentation, vector-friendly
Composition/framing: centered, no extra objects, balanced spacing, strong logo hierarchy
Lighting/mood: calm, crafty, playful, modern
Color palette: charcoal ink with accents in muted red, orange, teal, blue, yellow
Materials/textures: paper grain, colored pencil texture, subtle imperfect outline
Text (verbatim): "ㅋㄹㅎㅌ" and "컬러헌트"
Constraints: keep the shorthand dominant, keep the supporting text secondary and readable, no decorative clutter, no watermark
Avoid: heavy shadows, glossy gradients, childish cartoon faces, camera symbols
```

### C. 파비콘 심볼 프롬프트

```text
Use case: logo-brand
Asset type: favicon/app icon symbol
Primary request: create a simple square brand symbol for Color Hunt derived from the handwritten shorthand logo ㅋㄹㅎㅌ, based on hand-drawn grid collage energy and colored pencil marks
Scene/backdrop: plain off-white or transparent-style clean presentation
Subject: a minimal square icon that abstracts the rhythm of ㅋㄹㅎㅌ into a bold hand-drawn symbol, optionally supported by a subtle 3x3 grid
Style/medium: icon design, hand-drawn but clean, vector-friendly, high contrast
Composition/framing: centered square icon, strong silhouette, no text
Lighting/mood: flat and crisp
Color palette: off-white, charcoal, muted red, yellow, teal, blue
Materials/textures: slight colored pencil texture only, not noisy
Constraints: recognizable at 16px and 32px, thick enough lines, no tiny details, no watermark
Avoid: gradients, glassmorphism, tiny text, photoreal texture
```

### D. OG 이미지 프롬프트

```text
Use case: ui-mockup
Asset type: open graph social preview image
Primary request: create a clean open graph image for a mobile web app called Color Hunt that lets users collect same-color photos and arrange them into a social collage grid
Scene/backdrop: warm off-white paper background with subtle grain
Subject: a mobile-style collage card showing a 3x3 grid of color-dominant photo tiles, with the handwritten shorthand logo ㅋㄹㅎㅌ as the main brand mark and a short Korean tagline
Style/medium: polished editorial app preview, hand-drawn accents, modern but warm
Composition/framing: wide 1200x630 composition, hero card slightly off-center, logo area clearly readable, balanced negative space
Lighting/mood: bright, warm, inviting, social
Color palette: paper beige, charcoal, muted pencil red, orange, yellow, green, teal, blue
Materials/textures: paper grain, colored pencil accents, subtle rough outline details
Text (verbatim): "ㅋㄹㅎㅌ" and "색을 모으고, 그리드에 담다"
Constraints: must read clearly as an app for color collage making, keep the shorthand mark expressive, avoid clutter, no watermark, no fake UI chrome overload
Avoid: dark background, futuristic gradients, stock-photo people, excessive tiny text
```

> 실제로 채택한 로고 프롬프트는 `docs/prompts/logo-krlht-single.md`에 있다.

## 7. 실전 생성 메모

### 추천 워크플로
- 1차는 `ㅋㄹㅎㅌ` 단독 로고로 형태를 잡는다.
- 형태가 좋으면 같은 구조로 `ㅋㄹㅎㅌ + 컬러헌트` 조합형을 별도 생성한다.
- 파비콘은 로고를 그대로 축소하지 말고 심볼을 따로 만든다.
- OG는 마지막에 확정된 로고/심볼을 참조해 톤만 맞춘다.

### 후처리 메모
- 생성형 결과는 자음 획의 균형이 흔들릴 수 있으므로, 최종 로고는 이미지 결과를 바탕으로 SVG나 수작업 보정이 필요할 수 있다.
- favicon은 생성 이미지에서 바로 쓰기보다 리드 심볼을 선택한 뒤 벡터/정리 단계를 거치는 편이 안정적이다.
- OG 이미지는 비트맵 그대로 써도 무방하지만, 로고만큼은 후속 보정 가능성을 열어두는 편이 좋다.

## 8. 적용 현황

### 완료
- **파비콘 세트**: `favicon-32.png`, `favicon-192.png`, `apple-touch-icon.png` 생성 및 `index.html` 연결 완료. (`favicon.svg`는 더 이상 참조하지 않는다.)
- **OG 이미지**: `public/og.png` 생성, `index.html`에 OG 8종 + Twitter 4종 + canonical + JSON-LD(`WebApplication`) 연결 완료.
- **로고**: `public/logo.png` 생성, README에 노출.
- **태그라인**: `색을 모으고, 그리드에 담다` — 온보딩 화면과 OG에 실제 적용됨.

### 브랜드명 사용처

| 이름 | 쓰이는 곳 |
|---|---|
| `ㅋㄹㅎㅌ` | 로고 워드마크 |
| `컬러헌트` | 웹 서비스명, `og:site_name`, README |
| `컬러헌트런` / `color-hunt-run` | 앱인토스 미니앱명, 딥링크 `intoss://color-hunt-run`, SEO 보조 키워드 |

## 9. 남은 과제

### 미니앱 자산
앱인토스 콘솔은 웹 파비콘/OG와 **별개로** 미니앱 아이콘과 스토어 스크린샷을 요구한다.

- 미니앱 아이콘: 콘솔에 업로드 완료. 다크모드용 아이콘은 미등록.
- 스토어 스크린샷: 세로 636x1048 / 가로 1504x741. 해상도가 1px이라도 다르면 업로드가 거부된다.
- 가로 썸네일: 1932x828.
- **`apps-in-toss.config.ts`의 `brand.primaryColor`가 아직 스캐폴드 기본값 `#FAF8F3`이다.** 앱 종이색 `#f6f1e3`과 미묘하게 다르므로 브랜드 결정이 필요하다.

### 로고
- SVG 재작업
- 투명 배경 / 심볼형 / 락업형 변형
- 어두운 배경(`#1f1d1b`) 대응 확인
