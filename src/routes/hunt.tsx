import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AppState, CellState, GridLineMode } from "../types";
import { applyLayoutChange, nextLayout } from "../lib/layout-utils";
import { DEFAULT_STATE, loadState, saveState } from "../lib/storage";
import { composeAndDownload } from "../lib/compose";
import { resizeToDataUrl } from "../lib/image";
import GridBoard from "../components/grid-board";
import FloatingDock, { type AspectChoice } from "../components/floating-dock";
import CellEditor from "../components/cell-editor";

const LINE_CYCLE: Record<GridLineMode, GridLineMode> = {
  white: "black",
  black: "none",
  none: "white",
};

export default function Hunt() {
  const [state, setState] = useState<AppState>(() => DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [loadingIndices, setLoadingIndices] = useState<Set<number>>(new Set());
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

  // sources: 웹은 File, 앱인토스는 앨범에서 받은 data URL 문자열
  const handleUpload = async (sources: (File | string)[], fromIndex: number) => {
    const targetIndices: number[] = [];
    for (let idx = fromIndex; idx < state.cells.length && targetIndices.length < sources.length; idx++) {
      if (!state.cells[idx].imageDataUrl) targetIndices.push(idx);
    }
    if (targetIndices.length === 0) return;

    setLoadingIndices((prev) => new Set([...prev, ...targetIndices]));

    await Promise.all(
      targetIndices.map(async (targetIndex, sourceIndex) => {
        const source = sources[sourceIndex];
        try {
          const url = await resizeToDataUrl(source);
          setState((s) => {
            const cells = s.cells.slice();
            cells[targetIndex] = {
              ...cells[targetIndex],
              imageDataUrl: url,
              transform: undefined,
            };
            return { ...s, cells };
          });
        } catch (err) {
          console.error("[colorhunt] image processing failed:", err);
        } finally {
          setLoadingIndices((prev) => {
            const next = new Set(prev);
            next.delete(targetIndex);
            return next;
          });
        }
      }),
    );
  };

  const handleActivateCell = (i: number) => {
    setEditingIndex(i);
  };

  const handleCloseEditor = () => {
    setEditingIndex(null);
  };

  const handleCycleLayout = () => {
    setState((s) => applyLayoutChange(s, nextLayout(s.layout)));
    setEditingIndex(null);
  };

  const handleCycleLineMode = () => {
    setState((s) => ({ ...s, gridLineMode: LINE_CYCLE[s.gridLineMode] }));
  };

  const handleSave = async (choice: AspectChoice) => {
    if (busy) return;
    let aspect: { w: number; h: number };
    let snapshot:
      | {
          frame: { w: number; h: number };
          cells: { x: number; y: number; w: number; h: number }[];
        }
      | undefined;
    if (choice === "device") {
      const el = frameRef.current;
      if (!el) return;
      const frameRect = el.getBoundingClientRect();
      const nodes = Array.from(
        el.querySelectorAll<HTMLElement>("[data-cell-index]"),
      );
      const cells = nodes
        .map((node) => {
          const idx = Number(node.dataset.cellIndex);
          const rect = node.getBoundingClientRect();
          return Number.isFinite(idx)
            ? {
                idx,
                x: rect.left - frameRect.left,
                y: rect.top - frameRect.top,
                w: rect.width,
                h: rect.height,
              }
            : null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => a.idx - b.idx)
        .map(({ x, y, w, h }) => ({ x, y, w, h }));

      aspect = { w: frameRect.width, h: frameRect.height };
      if (cells.length === state.cells.length) {
        snapshot = { frame: aspect, cells };
      }
    } else {
      aspect = choice;
    }
    setBusy(true);
    try {
      await composeAndDownload(state, aspect, snapshot);
    } catch (err) {
      console.error("[colorhunt] download failed:", err);
    } finally {
      setBusy(false);
    }
  };

  const editingCell =
    editingIndex !== null ? state.cells[editingIndex] : null;

  return (
    <div ref={frameRef} className="absolute inset-0">
      <GridBoard
        state={state}
        loadingIndices={loadingIndices}
        onUpload={handleUpload}
        onActivateCell={handleActivateCell}
      />

      {editingCell && editingIndex !== null && (
        <CellEditor
          cell={editingCell}
          index={editingIndex}
          layout={state.layout}
          onUpdate={(next) => handleChangeCell(editingIndex, next)}
          onClose={handleCloseEditor}
        />
      )}

      {editingIndex === null && (
        <FloatingDock
          layout={state.layout}
          gridLineMode={state.gridLineMode}
          busy={busy}
          onCycleLayout={handleCycleLayout}
          onCycleLineMode={handleCycleLineMode}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
