import { useState } from "react";
import { render } from "../engine/render";
import { exportPlain, exportMarkdown, modelToJSON } from "../engine/exporters";
import { generateTextual } from "../codegen/textual";
import { generateRatatui } from "../codegen/ratatui";
import { generateBubbleTea } from "../codegen/bubbletea";
import { generateInk } from "../codegen/ink";
import type { Node } from "../engine/model";
import type { Palette, Theme } from "../state/useEddaState";

function resolve(palette: Palette, color?: string): string {
  if (!color) return palette.fg;
  return (palette as Record<string, string>)[color] || color;
}

const MAIN_TABS = [
  { key: "ansi",  label: "ANSI"     },
  { key: "plain", label: "Plain"    },
  { key: "md",    label: "Markdown" },
  { key: "json",  label: "JSON"     },
  { key: "code",  label: "⌨ Code"  },
];

const FRAMEWORKS = [
  { key: "textual",   label: "Textual",    sub: "Python" },
  { key: "ratatui",   label: "Ratatui",    sub: "Rust"   },
  { key: "bubbletea", label: "Bubble Tea", sub: "Go"     },
  { key: "ink",       label: "Ink",        sub: "React"  },
];

interface Props { doc: Node; cols: number; theme: Theme; palette: Palette; mockData: unknown; onClose: () => void; }

export function ExportDrawer({ doc, cols, theme, palette, mockData, onClose }: Props) {
  const [mainTab,   setMainTab  ] = useState("ansi");
  const [framework, setFramework] = useState("textual");
  const [copied,    setCopied   ] = useState(false);

  let text = "";
  let codeExt = ".py";
  if (mainTab === "plain")  text = exportPlain(doc, cols, theme, mockData);
  if (mainTab === "md")     text = exportMarkdown(doc, cols, theme, mockData);
  if (mainTab === "json")   text = modelToJSON(doc);
  if (mainTab === "code") {
    if (framework === "textual")   { text = generateTextual(doc, cols, mockData);   codeExt = ".py";  }
    if (framework === "ratatui")   { text = generateRatatui(doc, cols, mockData);   codeExt = ".rs";  }
    if (framework === "bubbletea") { text = generateBubbleTea(doc, cols, mockData); codeExt = ".go";  }
    if (framework === "ink")       { text = generateInk(doc, cols, mockData);       codeExt = ".jsx"; }
  }

  function copy() {
    const t = mainTab === "ansi" ? exportPlain(doc, cols, theme, mockData) : text;
    navigator.clipboard?.writeText(t);
    setCopied(true); setTimeout(() => setCopied(false), 1200);
  }
  function download() {
    const ext = mainTab === "plain" ? ".txt" : mainTab === "md" ? ".md" : mainTab === "json" ? ".json" : codeExt;
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "edda-export" + ext; a.click(); URL.revokeObjectURL(a.href);
  }

  const ansiLines = mainTab === "ansi" ? render(doc, cols, theme, mockData) : null;

  let body: React.ReactNode;
  if (mainTab === "ansi" && ansiLines) {
    body = (
      <div className="export-ansi">
        <div className="term-grid" style={{ fontSize: "13px", width: cols + "ch" }}>
          {ansiLines.map((runs, li) => (
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
    );
  } else if (mainTab === "code") {
    body = (
      <div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {FRAMEWORKS.map((fw) => (
            <button
              key={fw.key}
              style={{
                border: "1px solid " + (framework === fw.key ? "color-mix(in srgb,var(--accent) 50%,var(--line))" : "var(--line)"),
                background: framework === fw.key ? "color-mix(in srgb,var(--accent) 10%,#10141a)" : "#0a0c10",
                color: framework === fw.key ? "var(--accent)" : "var(--txt-2)",
                fontFamily: "var(--mono)", fontSize: 11.5, padding: "6px 12px", borderRadius: 6, cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1,
              }}
              onClick={() => setFramework(fw.key)}
            >
              <span style={{ fontWeight: 600 }}>{fw.label}</span>
              <span style={{ fontSize: 10, opacity: 0.6 }}>{fw.sub}</span>
            </button>
          ))}
        </div>
        <pre className="export-pre">{text}</pre>
      </div>
    );
  } else {
    body = <pre className="export-pre">{text}</pre>;
  }

  const metaLabel = mainTab === "code"
    ? (FRAMEWORKS.find((f) => f.key === framework)?.label ?? "") + " scaffold · " + cols + " cols"
    : (mainTab === "ansi" ? "ANSI preview" : mainTab) + " · " + cols + " cols";

  return (
    <div className="export-drawer">
      <div className="export-head">
        <div className="export-tabs">
          {MAIN_TABS.map((t) => (
            <button key={t.key} className={"export-tab" + (mainTab === t.key ? " on" : "")} onClick={() => setMainTab(t.key)}>{t.label}</button>
          ))}
        </div>
        <div className="export-actions">
          <span className="export-meta">{metaLabel}</span>
          {mainTab !== "ansi" && <button className="btn ghost" onClick={download}>⬇ Save</button>}
          <button className="btn ghost" onClick={copy}>{copied ? "Copied ✓" : "Copy"}</button>
          <button className="btn ghost" onClick={onClose}>Close ✕</button>
        </div>
      </div>
      <div className="export-body">{body}</div>
    </div>
  );
}
