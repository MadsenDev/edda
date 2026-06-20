import type { Palette, Theme } from "../state/useEddaState";

const ACCENTS = [
  { key: "mint",   val: "#5fd7a0" }, { key: "green",  val: "#56d364" },
  { key: "cyan",   val: "#39c5cf" }, { key: "blue",   val: "#539bf5" },
  { key: "violet", val: "#bc8cff" }, { key: "amber",  val: "#e3b341" },
  { key: "rose",   val: "#f778ba" },
];

const BGS = [
  { key: "black", val: "#07080a" }, { key: "ink",  val: "#0d1117" },
  { key: "navy",  val: "#0a0e1a" }, { key: "warm", val: "#12100e" },
];

function Seg({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="seg">
        {options.map((o) => (
          <button key={o.value} type="button" className={"seg-btn" + (value === o.value ? " on" : "")} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface Props {
  theme: Theme;
  palette: Palette;
  onTheme: (p: Partial<Theme>) => void;
  onPalette: (p: Partial<Palette>) => void;
}

export function ThemeDesigner({ theme, palette, onTheme, onPalette }: Props) {
  return (
    <div className="panel-body theme">
      <Seg
        label="Default border"
        value={theme.border || "single"}
        options={[{ value: "single", label: "─" }, { value: "rounded", label: "╭" }, { value: "double", label: "═" }, { value: "heavy", label: "┏" }, { value: "ascii", label: "+" }]}
        onChange={(v) => onTheme({ border: v })}
      />
      <div className="field">
        <span className="field-label">Accent</span>
        <div className="swatches">
          {ACCENTS.map((a) => (
            <button key={a.key} type="button" className={"swatch" + (palette.accent === a.val ? " on" : "")} style={{ background: a.val }} title={a.key} onClick={() => onPalette({ accent: a.val })} />
          ))}
        </div>
      </div>
      <div className="field">
        <span className="field-label">Background</span>
        <div className="swatches">
          {BGS.map((b) => (
            <button key={b.key} type="button" className={"swatch big" + (palette.bg === b.val ? " on" : "")} style={{ background: b.val }} title={b.key} onClick={() => onPalette({ bg: b.val })} />
          ))}
        </div>
      </div>
      <div className="field">
        <span className="field-label">Unicode mode</span>
        <div className="seg">
          <button type="button" className={"seg-btn" + (theme.border !== "ascii" ? " on" : "")} onClick={() => onTheme({ border: theme._lastUnicode || "single" })}>Unicode</button>
          <button type="button" className={"seg-btn" + (theme.border === "ascii" ? " on" : "")} onClick={() => onTheme({ border: "ascii", _lastUnicode: theme.border === "ascii" ? (theme._lastUnicode || "single") : theme.border })}>ASCII</button>
        </div>
      </div>
      <div className="field">
        <span className="field-label">Palette</span>
        <div className="palette-preview">
          {(["fg", "dim", "accent", "green", "cyan", "blue", "magenta", "yellow", "red", "border"] as const).map((k) => (
            <div key={k} className="pp-chip">
              <span className="pp-dot" style={{ background: palette[k] }} />
              <span className="pp-name">{k}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
