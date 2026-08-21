import { useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearState,
  hasSavedWork,
  loadState,
} from "../lib/storage";
import { ConfirmDialog } from "@toss/tds-mobile";
import { isInToss } from "../lib/toss";

const TITLE_CHARS: Array<{ ch: string; color: string; rotate: number }> = [
  { ch: "컬", color: "var(--color-pencil-red)", rotate: -3 },
  { ch: "러", color: "var(--color-pencil-orange)", rotate: 2 },
  { ch: "헌", color: "var(--color-pencil-teal)", rotate: -2 },
  { ch: "트", color: "var(--color-pencil-blue)", rotate: 3 },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [resumeAvailable, setResumeAvailable] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useLayoutEffect(() => {
    setResumeAvailable(hasSavedWork(loadState()));
  }, []);

  const handleStart = () => {
    navigate("/hunt");
  };

  // 모아둔 사진이 전부 사라지는 동작이라 확인을 받고 진행한다.
  const handleReset = () => {
    clearState();
    setResumeAvailable(false);
    setConfirmOpen(false);
    navigate("/hunt");
  };

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

      <div className="flex flex-col items-center gap-3">
        <ActionButton
          label={resumeAvailable ? "이어하기" : "시작하기"}
          onClick={handleStart}
        />

        {resumeAvailable && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="rounded-full px-4 py-2 text-base font-bold text-ink/62 transition-colors hover:text-ink active:scale-95"
          >
            지우고 다시하기
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="다 지울까요?"
        description="모아둔 사진이 모두 사라져요. 이 동작은 되돌릴 수 없어요."
        onClose={() => setConfirmOpen(false)}
        cancelButton={
          <ConfirmDialog.CancelButton onClick={() => setConfirmOpen(false)}>
            그대로 둘래요
          </ConfirmDialog.CancelButton>
        }
        confirmButton={
          <ConfirmDialog.ConfirmButton onClick={handleReset}>
            지우기
          </ConfirmDialog.ConfirmButton>
        }
      />

      <p className="absolute bottom-14 text-sm text-ink/60">
        색을 모으고, 그리드에 담다
      </p>

      {/* 앱인토스 심사 기준상 미니앱에서 자사 서비스로 유도하는 링크를 둘 수 없다.
          웹(color-hunt.run)에서는 그대로 노출한다. */}
      {!isInToss() && (
      <footer
        className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5 text-xs text-ink/55"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <span>Published by</span>
        <a
          href="https://github.com/anveloper/color-hunt"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 underline-offset-2 hover:underline focus-visible:underline"
          aria-label="GitHub 레포지토리로 이동"
        >
          <span className="font-bold">anveloper</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-.99-.02-1.95-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
          </svg>
        </a>
      </footer>
      )}
    </main>
  );
}

function ActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
      <span className="relative">{label}</span>
    </button>
  );
}
