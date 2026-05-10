import { useNavigate } from "react-router-dom";

const TITLE_CHARS: Array<{ ch: string; color: string; rotate: number }> = [
  { ch: "컬", color: "var(--color-pencil-red)", rotate: -3 },
  { ch: "러", color: "var(--color-pencil-orange)", rotate: 2 },
  { ch: "헌", color: "var(--color-pencil-teal)", rotate: -2 },
  { ch: "트", color: "var(--color-pencil-blue)", rotate: 3 },
];

export default function Onboarding() {
  const navigate = useNavigate();

  return (
    <main className="relative flex h-full w-full flex-col items-center justify-center gap-14 px-8">
      {/* SVG 필터 정의 — 손떨림(displacement) + 결(turbulence) */}
      <svg
        aria-hidden="true"
        width="0"
        height="0"
        className="absolute"
        style={{ position: "absolute" }}
      >
        <defs>
          <filter
            id="pencil-wobble"
            x="-5%"
            y="-5%"
            width="110%"
            height="110%"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.03"
              numOctaves="2"
              seed="4"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="1.6"
            />
          </filter>
          <filter id="pencil-rough" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.02"
              numOctaves="3"
              seed="7"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="2.4"
            />
          </filter>
        </defs>
      </svg>

      <h1
        className="pencil-text flex select-none gap-1 text-[5.5rem] leading-none font-bold"
        aria-label="컬러헌트"
      >
        {TITLE_CHARS.map(({ ch, color, rotate }) => (
          <span
            key={ch}
            style={{
              color,
              transform: `rotate(${rotate}deg)`,
              display: "inline-block",
            }}
          >
            {ch}
          </span>
        ))}
      </h1>

      <button
        type="button"
        onClick={() => navigate("/hunt")}
        className="relative px-12 py-3 text-3xl font-bold text-ink transition-transform active:scale-95"
        style={{ minWidth: "13rem" }}
      >
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          viewBox="0 0 220 70"
          style={{ filter: "url(#pencil-rough)" }}
        >
          {/* 두 번 겹쳐 그어 더블 스트로크 색연필 느낌 */}
          <rect
            x="6"
            y="6"
            width="208"
            height="58"
            rx="14"
            ry="14"
            fill="none"
            stroke="var(--color-pencil-red)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />
          <rect
            x="8"
            y="8"
            width="204"
            height="54"
            rx="12"
            ry="12"
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="0 0"
            opacity="0.75"
          />
        </svg>
        <span className="relative">시작하기</span>
      </button>

      <p className="absolute bottom-10 text-sm text-ink/60">
        색을 모으고, 그리드에 담다
      </p>
    </main>
  );
}
