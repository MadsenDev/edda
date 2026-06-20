import { render } from "../engine/render";
import type { Node } from "../engine/model";
import type { Palette, Theme } from "../state/useEddaState";

function resolve(palette: Palette, color?: string): string {
  if (!color) return palette.fg;
  return (palette as Record<string, string>)[color] || color;
}

interface Props {
  doc: Node;
  cols: number;
  theme: Theme;
  palette: Palette;
  label: string;
  active: boolean;
  onClick: () => void;
  mockData: unknown;
}

export function MiniPreview({ doc, cols, theme, palette, label, active, onClick, mockData }: Props) {
  const lines = render(doc, cols, theme, mockData);
  const fs = Math.max(3, Math.min(9, 250 / cols / 0.6));
  return (
    <div className={"mini" + (active ? " active" : "")} onClick={onClick}>
      <div className="mini-head">
        <span className="mini-label">{label}</span>
        <span className="mini-dim">{cols} cols</span>
      </div>
      <div className="mini-screen">
        <div className="term-grid mini-grid" style={{ fontSize: fs + "px", width: cols + "ch" }}>
          {lines.map((runs, li) => (
            <div key={li} className="term-line">
              {runs.length === 0 ? <span>&nbsp;</span> :
                runs.map((r, ri) => (
                  <span key={ri} style={{ color: resolve(palette, r.color), fontWeight: r.bold ? 700 : 400, opacity: r.dim ? 0.5 : 1 }}>
                    {r.text.length ? r.text.replace(/ /g, " ") : " "}
                  </span>
                ))
              }
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
