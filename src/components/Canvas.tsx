import { useState, useRef } from "react";
import { render } from "../engine/render";
import { TerminalLines } from "./TerminalLines";
import type { Node } from "../engine/model";
import type { Palette, Theme } from "../state/useEddaState";

interface Props {
  doc: Node;
  cols: number;
  theme: Theme;
  palette: Palette;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDropNew: (type: string, idx: number) => void;
  onMove: (moveId: string, idx: number) => void;
  fontSize: number;
  mockData: unknown;
}

export function Canvas({ doc, cols, theme, palette, selectedId, onSelect, onDropNew, onMove, fontSize, mockData }: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const _dragData = useRef<null>(null);

  const isColumn = doc?.type === "column";
  const blocks   = isColumn ? ((doc as Node & { children: Node[] }).children || []) : [doc];

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (dropIdx !== idx) setDropIdx(idx);
  }

  function handleDrop(e: React.DragEvent, idx: number) {
    e.preventDefault();
    let payload: { newType?: string; moveId?: string } | null = null;
    try { payload = JSON.parse(e.dataTransfer.getData("application/edda") || e.dataTransfer.getData("text/plain") || "null"); } catch (_) {}
    setDropIdx(null);
    if (!payload) return;
    if (payload.newType) onDropNew(payload.newType, idx);
    else if (payload.moveId) onMove(payload.moveId, idx);
  }

  const gap = (idx: number) => (
    <div
      key={"gap" + idx}
      className={"drop-gap" + (dropIdx === idx ? " active" : "")}
      onDragOver={(e) => handleDragOver(e, idx)}
      onDragLeave={() => setDropIdx((d) => (d === idx ? null : d))}
      onDrop={(e) => handleDrop(e, idx)}
    >
      <span className="drop-caret">▸ insert here</span>
    </div>
  );

  const lh = 1.55;
  const out: React.ReactNode[] = [];
  if (isColumn) out.push(gap(0));

  blocks.forEach((b, i) => {
    const lines = render(b, cols, theme, mockData);
    const sel   = selectedId === b.id;
    out.push(
      <div
        key={b.id}
        className={"term-block" + (sel ? " selected" : "")}
        draggable={isColumn}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          const d = JSON.stringify({ moveId: b.id });
          e.dataTransfer.setData("application/edda", d);
          e.dataTransfer.setData("text/plain", d);
        }}
        onClick={(e) => { e.stopPropagation(); onSelect(b.id); }}
      >
        <TerminalLines
          lines={lines}
          palette={palette}
          selectedId={selectedId}
          hoverId={hoverId}
          onSelect={(id) => onSelect(id)}
          onHover={setHoverId}
          blockId={b.id}
          lineHeight={lh}
        />
      </div>
    );
    if (isColumn) out.push(gap(i + 1));
  });

  return (
    <div
      className="term-grid"
      style={{ fontSize: (fontSize || 15) + "px", width: cols + "ch" }}
      onMouseLeave={() => setHoverId(null)}
    >
      {out}
    </div>
  );
}
