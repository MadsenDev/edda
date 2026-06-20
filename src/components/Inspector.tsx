import { resolveBinding, resolveBindings } from "../engine/bindings";
import type { Node, Color } from "../engine/model";
import type { Palette } from "../state/useEddaState";

const COLORS: Color[] = ["fg", "dim", "accent", "green", "cyan", "blue", "magenta", "yellow", "red", "border"];

function Field({ label, hint, hintAccent, children }: { label: string; hint?: string | null; hintAccent?: boolean; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <div className="field-help" style={hintAccent ? { color: "var(--accent)", opacity: 0.85 } : {}}>{hint}</div>}
    </label>
  );
}

function ColorField({ label, value, palette, onChange }: { label: string; value: string; palette: Palette; onChange: (c: Color) => void }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="swatches">
        {COLORS.map((c) => (
          <button
            key={c} type="button"
            className={"swatch" + (value === c ? " on" : "")}
            title={c}
            style={{ background: (palette as Record<string, string>)[c] || c }}
            onClick={() => onChange(c)}
          />
        ))}
      </div>
    </div>
  );
}

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
  node: Node | null;
  palette: Palette;
  mockData: unknown;
  onChange: (id: string, patch: Partial<Node>) => void;
  onAction: (kind: string, id: string) => void;
}

export function Inspector({ node, palette, mockData, onChange, onAction }: Props) {
  if (!node) {
    return (
      <div className="panel-body inspector empty">
        <div className="empty-state">
          <div className="empty-glyph">⌖</div>
          <div>Select an element</div>
          <div className="empty-sub">Click anything on the canvas or in the layers panel.</div>
        </div>
      </div>
    );
  }

  const set = (k: string, v: unknown) => onChange(node.id, { [k]: v === "" ? undefined : v } as Partial<Node>);
  const has = (t: string) => node.type === t;

  const fields: React.ReactNode[] = [];

  fields.push(
    <div key="tt" className="insp-type">
      <span className="insp-type-badge">{node.type}</span>
      <span className="insp-id">{node.id}</span>
    </div>
  );

  if (has("text") || has("badge") || has("kbd")) {
    const val  = ("content" in node ? node.content : "") || "";
    const hasB = val.includes("{{");
    const resolved = (hasB && mockData) ? resolveBindings(val, mockData) : null;
    fields.push(
      <Field key="c" label="Content" hint={resolved ? "→ " + resolved : null} hintAccent>
        <input className="inp" value={val} placeholder='e.g. {{server.cpu}} or plain text' onChange={(e) => set("content", e.target.value)} />
      </Field>
    );
  }
  if (has("text")) {
    fields.push(<Seg key="al" label="Align" value={("align" in node ? node.align : "") || "left"} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} onChange={(v) => set("align", v)} />);
    fields.push(
      <div key="tg" className="field toggles">
        <button type="button" className={"tog" + ("bold" in node && node.bold ? " on" : "")} onClick={() => set("bold", !("bold" in node && node.bold))}>Bold</button>
        <button type="button" className={"tog" + ("dim"  in node && node.dim  ? " on" : "")} onClick={() => set("dim",  !("dim"  in node && node.dim))}>Dim</button>
        <button type="button" className={"tog" + ("wrap" in node && node.wrap ? " on" : "")} onClick={() => set("wrap", !("wrap" in node && node.wrap))}>Wrap</button>
      </div>
    );
  }
  if (has("divider")) {
    fields.push(<Seg key="dc" label="Character" value={("char" in node ? node.char : "") || "─"} options={[{ value: "─", label: "─" }, { value: "═", label: "═" }, { value: "╌", label: "╌" }, { value: "·", label: "·" }, { value: "-", label: "-" }]} onChange={(v) => set("char", v)} />);
  }
  if (has("spacer")) {
    const lines = ("lines" in node ? node.lines : 1) || 1;
    fields.push(
      <Field key="ln" label={"Lines: " + lines}>
        <input className="rng" type="range" min={1} max={6} value={lines} onChange={(e) => set("lines", +e.target.value)} />
      </Field>
    );
  }
  if (has("fill")) {
    fields.push(<Seg key="fc" label="Fill style" value={("char" in node ? node.char : "") || "."} options={[{ value: ".", label: "…" }, { value: " ", label: "␣" }, { value: "─", label: "─" }, { value: "-", label: "-" }, { value: "█", label: "█" }, { value: "▒", label: "▒" }, { value: "·", label: "·" }]} onChange={(v) => set("char", v)} />);
  }
  if (has("progress")) {
    const vb = "valueBind" in node ? node.valueBind : undefined;
    const boundVal = (mockData && vb) ? resolveBinding(vb as string, mockData) : null;
    const boundOk  = boundVal != null;
    fields.push(
      <Field key="vb" label="Bind value to" hint={vb ? (boundOk ? "→ " + Math.round(+(boundVal as number)) + "%" : "→ unresolved") : null} hintAccent={boundOk}>
        <input className="inp" placeholder="e.g. server.cpu" value={vb || ""} onChange={(e) => set("valueBind", e.target.value)} />
      </Field>
    );
    if (!vb) {
      const val = ("value" in node ? node.value : 0) || 0;
      fields.push(
        <Field key="pv" label={"Value: " + val + "%"}>
          <input className="rng" type="range" min={0} max={100} value={val} onChange={(e) => set("value", +e.target.value)} />
        </Field>
      );
    }
    fields.push(<Seg key="pf" label="Track" value={("fillChar" in node ? node.fillChar : "") || "█"} options={[{ value: "█", label: "█" }, { value: "▰", label: "▰" }, { value: "=", label: "=" }, { value: "#", label: "#" }, { value: "■", label: "■" }]} onChange={(v) => set("fillChar", v)} />);
    fields.push(
      <Field key="pl" label="Label">
        <input className="inp" value={("label" in node ? node.label : "") || ""} onChange={(e) => set("label", e.target.value)} />
      </Field>
    );
    fields.push(
      <div key="pp" className="field toggles">
        <button type="button" className={"tog" + (("showPercent" in node ? node.showPercent : true) !== false ? " on" : "")} onClick={() => set("showPercent", ("showPercent" in node ? node.showPercent : true) === false)}>Show %</button>
      </div>
    );
  }
  if (has("status")) {
    fields.push(
      <Field key="sl" label="Label">
        <input className="inp" value={("label" in node ? node.label : "") || ""} onChange={(e) => set("label", e.target.value)} />
      </Field>
    );
    const sb = "stateBind" in node ? node.stateBind : undefined;
    const boundState = (mockData && sb) ? resolveBinding(sb as string, mockData) : null;
    fields.push(
      <Field key="sb" label="Bind state to" hint={sb ? (boundState ? "→ " + String(boundState) : "→ unresolved") : null} hintAccent={!!boundState}>
        <input className="inp" placeholder="e.g. server.statusState" value={sb || ""} onChange={(e) => set("stateBind", e.target.value)} />
      </Field>
    );
    if (!sb) {
      fields.push(<Seg key="ss" label="State" value={("state" in node ? node.state : "") || "ok"} options={[{ value: "ok", label: "OK" }, { value: "warn", label: "Warn" }, { value: "error", label: "Err" }, { value: "info", label: "Info" }, { value: "idle", label: "Idle" }, { value: "active", label: "Live" }]} onChange={(v) => set("state", v)} />);
    }
  }
  if (has("ascii")) {
    const val  = ("content" in node ? node.content : "") || "";
    const hasB = val.includes("{{");
    const resolved = (hasB && mockData) ? resolveBindings(val, mockData) : null;
    fields.push(
      <Field key="ac" label="Text" hint={resolved ? "→ " + resolved : null} hintAccent>
        <input className="inp" value={val} placeholder="e.g. EDDA or {{server.name}}" onChange={(e) => set("content", e.target.value)} />
      </Field>
    );
    fields.push(<Seg key="af" label="Fill" value={("fillChar" in node ? node.fillChar : "") || "█"} options={[{ value: "█", label: "█" }, { value: "▓", label: "▓" }, { value: "▒", label: "▒" }, { value: "#", label: "#" }, { value: "*", label: "*" }, { value: "@", label: "@" }]} onChange={(v) => set("fillChar", v)} />);
    fields.push(<Seg key="aa" label="Align" value={("align" in node ? node.align : "") || "left"} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} onChange={(v) => set("align", v)} />);
  }
  if (has("box")) {
    fields.push(
      <Field key="bt" label="Title">
        <input className="inp" value={("title" in node ? node.title : "") || ""} onChange={(e) => set("title", e.target.value)} />
      </Field>
    );
    fields.push(<Seg key="bb" label="Border" value={("border" in node ? node.border : "") || "single"} options={[{ value: "single", label: "─" }, { value: "rounded", label: "╭" }, { value: "double", label: "═" }, { value: "heavy", label: "┏" }, { value: "ascii", label: "+" }]} onChange={(v) => set("border", v)} />);
    const padX = ("padX" in node ? node.padX : 1) ?? 1;
    fields.push(
      <Field key="bp" label={"Padding X: " + padX}>
        <input className="rng" type="range" min={0} max={4} value={padX} onChange={(e) => set("padX", +e.target.value)} />
      </Field>
    );
  }
  if (has("split")) {
    const hasDivider = !("divider" in node && node.divider === false);
    fields.push(
      <div key="sp" className="field toggles">
        <button type="button" className={"tog" + (hasDivider ? " on" : "")} onClick={() => set("divider", !hasDivider)}>Divider</button>
      </div>
    );
  }
  if (has("list")) {
    fields.push(
      <Field key="lm" label="Marker">
        <input className="inp" value={("marker" in node ? node.marker : "") || ""} onChange={(e) => set("marker", e.target.value)} />
      </Field>
    );
    const items = ("items" in node ? node.items : []) || [];
    fields.push(
      <Field key="li" label="Items (one per line)">
        <textarea
          className="inp ta"
          rows={5}
          value={(items as Array<string | { text?: string }>).map((it) => typeof it === "string" ? it : (it.text || "")).join("\n")}
          onChange={(e) => set("items", e.target.value.split("\n").map((t) => ({ text: t, color: ("color" in node ? node.color : "fg") || "fg" })))}
        />
      </Field>
    );
  }
  if (has("row")) {
    fields.push(
      <Field key="rs" label="Stack below cols (0 = auto)">
        <input className="inp" type="number" value={("stackAt" in node ? node.stackAt : 0) || 0} onChange={(e) => set("stackAt", +e.target.value || null)} />
      </Field>
    );
    fields.push(<div key="rh" className="field-help">Row collapses to stacked lines when terminal is narrower.</div>);
  }
  if (has("collection")) {
    const src   = "source" in node ? node.source : undefined;
    const arr   = (mockData && src) ? resolveBinding(src as string, mockData) : null;
    const items = "mockItems" in node ? node.mockItems : [];
    const count = Array.isArray(arr) ? (arr as unknown[]).length : ((items as unknown[]) || []).length;
    const label = Array.isArray(arr) ? count + " items from mock data" : count + " items (mockItems)";
    fields.push(
      <Field key="cs" label="Source (data path)" hint={label}>
        <input className="inp" placeholder="e.g. services" value={src || ""} onChange={(e) => set("source", e.target.value)} />
      </Field>
    );
    fields.push(<div key="cth" className="field-help">Click items on the canvas to edit the row template.</div>);
  }

  if (!has("spacer") && !has("split") && !has("box") && !has("collection")) {
    const color = "color" in node ? (node.color as string) : (has("status") ? "" : "fg");
    fields.push(<ColorField key="col" label="Color" value={color || (has("status") ? "" : "fg")} palette={palette} onChange={(v) => set("color", v)} />);
  }
  if (has("box")) {
    const bc = "borderColor" in node ? (node.borderColor as string) : "border";
    fields.push(<ColorField key="bc" label="Border color" value={bc || "border"} palette={palette} onChange={(v) => set("borderColor", v)} />);
  }

  fields.push(
    <div key="act" className="insp-actions">
      <button className="act" onClick={() => onAction("up",   node.id)} title="Move up">↑</button>
      <button className="act" onClick={() => onAction("down", node.id)} title="Move down">↓</button>
      <button className="act" onClick={() => onAction("dup",  node.id)} title="Duplicate">⧉</button>
      <button className="act danger" onClick={() => onAction("del", node.id)} title="Delete">✕</button>
    </div>
  );

  return <div className="panel-body inspector">{fields}</div>;
}
