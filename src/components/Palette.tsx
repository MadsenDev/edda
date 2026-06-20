const PALETTE_GROUPS = [
  { name: "Text", items: [
    { type: "text",    label: "Text",     glyph: "T"  },
    { type: "heading", label: "Heading",  glyph: "H"  },
    { type: "divider", label: "Divider",  glyph: "─"  },
    { type: "spacer",  label: "Spacer",   glyph: "↕"  },
    { type: "badge",   label: "Badge",    glyph: "▢"  },
    { type: "kbd",     label: "Key",      glyph: "⌘"  },
    { type: "ascii",   label: "ASCII Art", glyph: "▟" },
  ]},
  { name: "Layout", items: [
    { type: "row",    label: "Row",        glyph: "⇆" },
    { type: "column", label: "Column",     glyph: "≡" },
    { type: "fill",   label: "Fill",       glyph: "…" },
    { type: "box",    label: "Box / Panel", glyph: "▢"},
    { type: "split",  label: "Split",      glyph: "◫" },
  ]},
  { name: "Data", items: [
    { type: "table",      label: "Table",      glyph: "▦" },
    { type: "list",       label: "List",       glyph: "☰" },
    { type: "progress",   label: "Progress",   glyph: "▰" },
    { type: "status",     label: "Status",     glyph: "●" },
    { type: "collection", label: "Collection", glyph: "⊞" },
  ]},
];

interface Props { onAdd: (type: string) => void; }

export function Palette({ onAdd }: Props) {
  return (
    <div className="panel-body palette">
      {PALETTE_GROUPS.map((g) => (
        <div key={g.name} className="pal-group">
          <div className="pal-group-title">{g.name}</div>
          <div className="pal-items">
            {g.items.map((it) => (
              <div
                key={it.type}
                className="pal-item"
                draggable
                title="Drag onto canvas or double-click to append"
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "copy";
                  const d = JSON.stringify({ newType: it.type });
                  e.dataTransfer.setData("application/edda", d);
                  e.dataTransfer.setData("text/plain", d);
                }}
                onDoubleClick={() => onAdd(it.type)}
              >
                <span className="pal-glyph">{it.glyph}</span>
                <span className="pal-label">{it.label}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="pal-hint">Drag a component onto the canvas, or double-click to append.</div>
    </div>
  );
}
