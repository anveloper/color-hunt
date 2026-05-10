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

  const handleUpload = async (files: File[], fromIndex: number) => {
    const dataUrls = await Promise.all(
      files.map((f) =>
        resizeToDataUrl(f).catch((err) => {
          console.error("[colorhunt] image processing failed:", err);
          return null;
        }),
      ),
    );
    setState((s) => {
      const cells = s.cells.slice();
      let idx = fromIndex;
      for (const url of dataUrls) {
        if (!url) continue;
        while (idx < cells.length && cells[idx].imageDataUrl) idx++;
        if (idx >= cells.length) break;
        cells[idx] = { ...cells[idx], imageDataUrl: url, transform: undefined };
        idx++;
      }
      return { ...s, cells };
    });
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
