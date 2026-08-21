import type { OverlayAsset, OverlayKind } from "../types";
import { OVERLAY_LABEL, OVERLAY_KINDS } from "../lib/overlay";
import TapButton from "./tap-button";

type Props = {
  overlays: OverlayAsset[];
  /** 데이터가 없어 켤 수 없는 요소 */
  disabledKinds: OverlayKind[];
  onToggle: (kind: OverlayKind) => void;
  onDone: () => void;
};

/**
 * 꾸미기 모드 전용 독. 어떤 요소를 넣고 뺄지 고른다.
 * 촬영을 끝낸 뒤 고정된 화면에서만 쓴다.
 */
export default function OverlayDock({
  overlays,
  disabledKinds,
  onToggle,
  onDone,
}: Props) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-4 z-50 flex justify-center px-4"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-ink/15 bg-paper/85 px-3 py-2 shadow-xl backdrop-blur">
        {OVERLAY_KINDS.map((kind) => {
          const asset = overlays.find((o) => o.kind === kind);
          const disabled = disabledKinds.includes(kind);
          const on = !disabled && asset?.visible === true;
          return (
            <TapButton
              key={kind}
              onClick={() => onToggle(kind)}
              disabled={disabled}
              className={
                "flex flex-col items-center justify-center rounded-full px-4 py-1.5 text-center transition-transform active:scale-95 " +
                (on ? "bg-ink text-paper" : "text-ink hover:bg-ink/5")
              }
            >
              <span className="text-base leading-none font-bold">
                {OVERLAY_LABEL[kind]}
              </span>
              <span className="text-[10px] leading-tight opacity-60">
                {disabled ? "기록 없음" : on ? "켬" : "켜면 원위치"}
              </span>
            </TapButton>
          );
        })}

        <span className="h-6 w-px bg-ink/15" aria-hidden="true" />

        <TapButton
          onClick={onDone}
          className="flex flex-col items-center justify-center rounded-full bg-ink px-4 py-1.5 text-center text-paper transition-transform active:scale-95"
        >
          <span className="text-base leading-none font-bold">완료</span>
          <span className="text-[10px] leading-tight opacity-60">꾸미기</span>
        </TapButton>
      </div>
    </div>
  );
}
