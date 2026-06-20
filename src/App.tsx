import { useState } from "react";
import { Canvas } from "./components/Canvas";
import { MiniPreview } from "./components/MiniPreview";
import { Palette } from "./components/Palette";
import { Inspector } from "./components/Inspector";
import { LayerTree } from "./components/LayerTree";
import { ThemeDesigner } from "./components/ThemeDesigner";
import { MockDataPanel } from "./components/MockDataPanel";
import { AIBar } from "./components/AIBar";
import { ExportDrawer } from "./components/ExportDrawer";
import { SettingsModal } from "./components/SettingsModal";
import { useEddaState, WIDTHS } from "./state/useEddaState";
import { SAMPLES } from "./samples";

const RIGHT_TABS: [string, string][] = [
  ["inspect", "Inspect"],
  ["layers",  "Layers" ],
  ["theme",   "Theme"  ],
  ["data",    "Data"   ],
];

export function App() {
  const state = useEddaState();
  const {
    mode, setMode,
    doc, sampleLabel,
    projectName, setProjectName,
    selectedId, setSelectedId,
    selectedNode,
    cols, setCols,
    theme, setTheme,
    palette, setPalette,
    mockData, setMockData,
    rightTab, setRightTab,
    exportOpen, setExportOpen,
    aiBusy, lineCount,
    fontSize,
    undo, updateNode, action,
    onDropNew, onMove, appendNew,
    loadSample, onAI, newCanvas,
  } = state;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmNew,   setConfirmNew  ] = useState(false);

  const cssVars = {
    "--bg":     palette.bg,
    "--accent": palette.accent,
    "--fg":     palette.fg,
    "--dim":    palette.dim,
    "--border": palette.border,
  } as React.CSSProperties;

  return (
    <div className="app" style={cssVars}>
      {/* topbar */}
      <header className="topbar">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 96 48" shapeRendering="crispEdges" aria-label="edda mark">
            <rect x={24} y={0}  width={24} height={24} />
            <rect x={0}  y={24} width={24} height={24} />
            <rect x={48} y={0}  width={24} height={24} />
            <rect x={72} y={24} width={24} height={24} />
          </svg>
          <span className="brand-name">edda</span>
          <span className="brand-sub">terminal designer</span>
        </div>

        <button className="project-btn" onClick={() => setSettingsOpen(true)} title="Project settings">
          <span className="project-btn-name">{projectName}</span>
          <span className="project-btn-caret">▾</span>
        </button>

        <div className="mode-switch">
          <button
            className={"mode-btn" + (mode === "cli" ? " on" : "")}
            onClick={() => { setMode("cli"); setSelectedId(null); }}
          >
            <span className="mode-glyph">$_</span>CLI Output
          </button>
          <button
            className={"mode-btn" + (mode === "tui" ? " on" : "")}
            onClick={() => { setMode("tui"); setSelectedId(null); }}
          >
            <span className="mode-glyph">▢</span>Fullscreen TUI
          </button>
        </div>

        <div className="samples">
          <span className="samples-label">samples</span>
          {Object.keys(SAMPLES[mode]).map((k) => (
            <button
              key={k}
              className={"sample-btn" + (sampleLabel[mode] === SAMPLES[mode][k].label ? " on" : "")}
              onClick={() => loadSample(mode, k)}
            >
              {SAMPLES[mode][k].label}
            </button>
          ))}
        </div>

        <div className="top-actions">
          <button className="btn ghost"   onClick={() => setConfirmNew(true)}       title="New canvas">+ New</button>
          <button className="btn ghost"   onClick={undo}                            title="Undo">↺ Undo</button>
          <button className="btn primary" onClick={() => setExportOpen((v) => !v)} title="Export">⇪ Export</button>
          <button className="btn ghost icon-btn" onClick={() => setSettingsOpen(true)} title="Settings">⚙</button>
        </div>
      </header>

      {/* workspace */}
      <div className="workspace">
        <aside className="left-panel">
          <div className="panel-head">
            <span>Components</span>
            <span className="panel-head-dim">drag in</span>
          </div>
          <Palette onAdd={appendNew} />
        </aside>

        <main className="center">
          <div className="canvas-scroll" onClick={() => setSelectedId(null)}>
            <div className="term-window" style={{ background: palette.bg }}>
              <div className="tw-bar">
                <div className="tw-dots"><i /><i /><i /></div>
                <div className="tw-title">
                  {projectName}{mode === "cli" ? "  ·  cli output" : "  ·  fullscreen tui"}
                </div>
                <div className="tw-size">{cols} × {lineCount}</div>
              </div>
              <div className="tw-screen" onClick={(e) => e.stopPropagation()}>
                <Canvas
                  doc={doc}
                  cols={cols}
                  theme={theme}
                  palette={palette}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onDropNew={onDropNew}
                  onMove={onMove}
                  fontSize={fontSize}
                  mockData={mockData}
                />
              </div>
            </div>

            <div className="responsive">
              <div className="responsive-head">
                <span className="responsive-title">Responsive preview</span>
                <div className="width-presets">
                  {WIDTHS.map((w) => (
                    <button
                      key={w.c}
                      className={"wp" + (cols === w.c ? " on" : "")}
                      onClick={() => setCols(w.c)}
                    >
                      {w.label}
                    </button>
                  ))}
                  <input
                    className="rng wide"
                    type="range"
                    min={24}
                    max={160}
                    value={cols}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setCols(+e.target.value)}
                  />
                  <span className="wp-val">{cols} cols</span>
                </div>
              </div>
              <div className="mini-row" onClick={(e) => e.stopPropagation()}>
                {([40, 80, 120] as const).map((c) => (
                  <MiniPreview
                    key={c}
                    doc={doc}
                    cols={c}
                    theme={theme}
                    palette={palette}
                    mockData={mockData}
                    label={c === 40 ? "narrow ssh" : c === 80 ? "standard 80" : "wide 120"}
                    active={cols === c}
                    onClick={() => setCols(c)}
                  />
                ))}
              </div>
            </div>
          </div>

          <AIBar onGenerate={onAI} busy={aiBusy} />
        </main>

        <aside className="right-panel">
          <div className="right-tabs">
            {RIGHT_TABS.map(([k, l]) => (
              <button
                key={k}
                className={"rtab" + (rightTab === k ? " on" : "")}
                onClick={() => setRightTab(k)}
              >
                {l}
              </button>
            ))}
          </div>
          {rightTab === "inspect" && (
            <Inspector
              node={selectedNode}
              palette={palette}
              mockData={mockData}
              onChange={updateNode}
              onAction={action}
            />
          )}
          {rightTab === "layers" && (
            <LayerTree doc={doc} selectedId={selectedId} onSelect={setSelectedId} />
          )}
          {rightTab === "theme" && (
            <ThemeDesigner
              theme={theme}
              palette={palette}
              onTheme={(p) => setTheme((t) => ({ ...t, ...p }))}
              onPalette={(p) => setPalette((pl) => ({ ...pl, ...p }))}
            />
          )}
          {rightTab === "data" && (
            <MockDataPanel doc={doc} mockData={mockData} onMockData={setMockData} />
          )}
        </aside>
      </div>

      {exportOpen && (
        <ExportDrawer
          doc={doc}
          cols={cols}
          theme={theme}
          palette={palette}
          mockData={mockData}
          onClose={() => setExportOpen(false)}
        />
      )}

      {confirmNew && (
        <div className="modal-overlay" onClick={() => setConfirmNew(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">New canvas</span>
              <button className="modal-close" onClick={() => setConfirmNew(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="modal-msg">This will clear all content in both CLI and TUI modes. Your current work will be lost.</p>
              <div className="modal-foot">
                <button className="btn ghost" onClick={() => setConfirmNew(false)}>Cancel</button>
                <button className="btn danger" onClick={() => { newCanvas(); setConfirmNew(false); }}>Clear &amp; start new</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <SettingsModal
          projectName={projectName}
          onRename={setProjectName}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
