import { useState } from "react";
import type { GridLineMode, Layout } from "../types";

export type AspectChoice = "device" | { w: number; h: number };

type AspectOption = {
  id: string;
  label: string;
  hint: string;
  choice: AspectChoice;
};

const ASPECT_OPTIONS: AspectOption[] = [
  { id: "device", label: "현재 화면", hint: "9 : 16 (디바이스 비율)", choice: "device" },
  { id: "1x1", label: "1 : 1", hint: "정사각 / 인스타 피드", choice: { w: 1, h: 1 } },
  { id: "4x5", label: "4 : 5", hint: "인스타 피드 세로", choice: { w: 4, h: 5 } },
  { id: "9x16", label: "9 : 16", hint: "인스타 스토리 / 릴스", choice: { w: 9, h: 16 } },
  { id: "16x9", label: "16 : 9", hint: "가로 / 와이드", choice: { w: 16, h: 9 } },
];

type Props = {
  layout: Layout;
  gridLineMode: GridLineMode;
  busy?: boolean;
  onCycleLayout: () => void;
  onCycleLineMode: () => void;
  onSave: (choice: AspectChoice) => void;
};

const LINE_LABEL: Record<GridLineMode, string> = {
  white: "흰선",
  black: "검선",
  none: "없음",
};

export default function FloatingDock({
  layout,
  gridLineMode,
  busy,
  onCycleLayout,
  onCycleLineMode,
  onSave,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSelect = (choice: AspectChoice) => {
    setMenuOpen(false);
    onSave(choice);
  };

  return (
    <>
      {menuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className="pointer-events-none absolute inset-x-0 bottom-4 z-50 flex justify-center px-4"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-ink/15 bg-paper/85 px-3 py-2 shadow-xl backdrop-blur">
          <DockButton onClick={onCycleLayout} label={layout} sub="레이아웃" />
          <Divider />
          <DockButton
            onClick={onCycleLineMode}
            label={LINE_LABEL[gridLineMode]}
            sub="그리드선"
          />
          <Divider />
          <div className="relative">
            <DockButton
              onClick={() => setMenuOpen((o) => !o)}
              label={busy ? "저장중…" : "저장"}
              sub={menuOpen ? "▴ 비율" : "▾ 비율"}
              disabled={busy}
              accent
            />
            {menuOpen && (
              <div
                role="menu"
                className="absolute bottom-full right-0 z-50 mb-3 w-56 overflow-hidden rounded-2xl border border-ink/15 bg-paper shadow-xl"
              >
                {ASPECT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    role="menuitem"
                    onClick={() => handleSelect(opt.choice)}
                    className="block w-full px-4 py-2.5 text-left transition-colors hover:bg-ink/5 active:bg-ink/10"
                  >
                    <div className="text-base font-bold leading-tight">
                      {opt.label}
                    </div>
                    <div className="text-xs leading-tight text-ink/55">
                      {opt.hint}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

type ButtonProps = {
  label: string;
  sub: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
};

function DockButton({ label, sub, onClick, disabled, accent }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        "flex flex-col items-center justify-center rounded-full px-4 py-1.5 text-center transition-transform active:scale-95 disabled:opacity-50 " +
        (accent ? "bg-ink text-paper" : "text-ink hover:bg-ink/5")
      }
    >
      <span className="text-base leading-none font-bold">{label}</span>
      <span className="text-[10px] leading-tight opacity-60">{sub}</span>
    </button>
  );
}

function Divider() {
  return <span className="h-6 w-px bg-ink/15" aria-hidden="true" />;
}
