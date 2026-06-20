import type { Line } from "../engine/render";
import type { Palette } from "../state/useEddaState";

function resolve(palette: Palette, color?: string): string {
  if (!color) return palette.fg;
  return (palette as Record<string, string>)[color] || color;
}

interface Props {
  lines: Line[];
  palette: Palette;
  selectedId: string | null;
  hoverId: string | null;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
  blockId?: string;
  lineHeight?: number;
}

export function TerminalLines({ lines, palette, selectedId, hoverId, onSelect, onHover, blockId, lineHeight = 1.55 }: Props) {
  return (
    <>
      {lines.map((runs, li) => (
        <div key={li} className="term-line" style={{ lineHeight: lineHeight + "em", height: lineHeight + "em" }}>
          {runs.length === 0 ? (
            <span
              className="term-run"
              onClick={(e) => { e.stopPropagation(); onSelect?.(blockId ?? ""); }}
            >&nbsp;</span>
          ) : runs.map((r, ri) => {
            const id    = r.id;
            const isSel = id != null && id === selectedId;
            const isHov = id != null && id === hoverId;
            const st: React.CSSProperties = {
              color: resolve(palette, r.color),
              fontWeight: r.bold ? 700 : 400,
              opacity: r.dim ? 0.5 : 1,
            };
            if (isSel) {
              st.background = `color-mix(in srgb,${palette.accent} 26%, transparent)`;
              st.opacity = 1;
              st.borderRadius = "2px";
            } else if (isHov) {
              st.background = `color-mix(in srgb,${palette.accent} 12%, transparent)`;
            }
            return (
              <span
                key={ri}
                className="term-run"
                style={st}
                onClick={(e) => { e.stopPropagation(); onSelect?.(id ?? blockId ?? ""); }}
                onMouseEnter={() => onHover?.(id ?? null)}
              >
                {r.text.length ? r.text.replace(/ /g, " ") : " "}
              </span>
            );
          })}
        </div>
      ))}
    </>
  );
}
