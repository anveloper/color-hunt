import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AppState, CellState, GridLineMode } from "../types";
import { applyLayoutChange, nextLayout } from "../lib/layout-utils";
import { DEFAULT_STATE, loadState, saveState } from "../lib/storage";
import { composeAndDownload } from "../lib/compose";
import GridBoard from "../components/grid-board";
import FloatingDock from "../components/floating-dock";

const LINE_CYCLE: Record<GridLineMode, GridLineMode> = {
  white: "black",
  black: "none",
  none: "white",
};

export default function Hunt() {
  const [state, setState] = useState<AppState>(() => DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveState(state);
  }, [state, hydrated]);

  const handleChangeCell = (i: number, next: CellState) => {
    setState((s) => {
      const cells = s.cells.slice();
      cells[i] = next;
      return { ...s, cells };
    });
  };

  const handleCycleLayout = () => {
    setState((s) => applyLayoutChange(s, nextLayout(s.layout)));
  };

  const handleCycleLineMode = () => {
    setState((s) => ({ ...s, gridLineMode: LINE_CYCLE[s.gridLineMode] }));
  };

  const handleDownload = async () => {
    const el = frameRef.current;
    if (!el || busy) return;
    const rect = el.getBoundingClientRect();
    setBusy(true);
    try {
      await composeAndDownload(state, { w: rect.width, h: rect.height });
    } catch (err) {
      console.error("[colorhunt] download failed:", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={frameRef} className="absolute inset-0">
      <GridBoard state={state} onChangeCell={handleChangeCell} />
      <FloatingDock
        layout={state.layout}
        gridLineMode={state.gridLineMode}
        busy={busy}
        onCycleLayout={handleCycleLayout}
        onCycleLineMode={handleCycleLineMode}
        onDownload={handleDownload}
      />
    </div>
  );
}
