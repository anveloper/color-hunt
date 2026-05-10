import type { GridLineMode, Layout } from "../types";

type Props = {
  layout: Layout;
  gridLineMode: GridLineMode;
  busy?: boolean;
  onCycleLayout: () => void;
  onCycleLineMode: () => void;
  onDownload: () => void;
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
  onDownload,
}: Props) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4"
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
        <DockButton
          onClick={onDownload}
          label={busy ? "저장중…" : "저장"}
          sub="다운로드"
          disabled={busy}
          accent
        />
      </div>
    </div>
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
