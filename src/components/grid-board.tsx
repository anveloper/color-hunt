import type { AppState, GridLineMode } from "../types";
import { LAYOUT_DIMS } from "../lib/layout-utils";
import GridCell from "./grid-cell";

type Props = {
  state: AppState;
  loadingIndices: Set<number>;
  onUpload: (sources: (File | string)[], fromIndex: number) => void;
  onRequestPhoto: (fromIndex: number, maxPickCount: number) => void;
  onActivateCell: (index: number) => void;
};

const LINE_COLOR: Record<GridLineMode, string | null> = {
  white: "#ffffff",
  black: "#1a1a1a",
  none: null,
};

export default function GridBoard({
  state,
  loadingIndices,
  onUpload,
  onRequestPhoto,
  onActivateCell,
}: Props) {
  const { cols, rows } = LAYOUT_DIMS[state.layout];
  const lineColor = LINE_COLOR[state.gridLineMode];

  return (
    <div
      className="absolute inset-0 grid"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        gap: 0,
      }}
    >
      {state.cells.map((cell, i) => (
        <GridCell
          key={cell.id}
          cell={cell}
          index={i}
          loading={loadingIndices.has(i)}
          maxPickCount={
            state.cells.slice(i).filter((c) => !c.imageDataUrl).length
          }
          onUpload={onUpload}
          onRequestPhoto={onRequestPhoto}
          onActivate={() => onActivateCell(i)}
        />
      ))}

      {lineColor && (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {Array.from({ length: cols - 1 }).map((_, i) => {
            const x = `${((i + 1) * 100) / cols}%`;
            return (
              <line
                key={`v-${i}`}
                x1={x}
                y1="0"
                x2={x}
                y2="100%"
                stroke={lineColor}
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {Array.from({ length: rows - 1 }).map((_, i) => {
            const y = `${((i + 1) * 100) / rows}%`;
            return (
              <line
                key={`h-${i}`}
                x1="0"
                y1={y}
                x2="100%"
                y2={y}
                stroke={lineColor}
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      )}
    </div>
  );
}
