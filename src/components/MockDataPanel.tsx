import { useState } from "react";
import { resolveBinding } from "../engine/bindings";
import type { Node } from "../engine/model";

function findBindings(root: Node): string[] {
  const seen = new Set<string>(), result: string[] = [];
  function scanStr(s: unknown) {
    if (!s || typeof s !== "string") return;
    const re = /\{\{([^}]+)\}\}/g; let m;
    while ((m = re.exec(s)) !== null) {
      const p = m[1].trim();
      if (!seen.has(p)) { seen.add(p); result.push(p); }
    }
  }
  function walkNode(n: Node) {
    if (!n) return;
    if ("content" in n) scanStr(n.content);
    if ("label"   in n) scanStr(n.label);
    if ("title"   in n) scanStr(n.title);
    if ("valueBind" in n && n.valueBind && !seen.has(n.valueBind)) { seen.add(n.valueBind); result.push(n.valueBind); }
    if ("stateBind" in n && n.stateBind && !seen.has(n.stateBind)) { seen.add(n.stateBind); result.push(n.stateBind); }
    if ("items" in n && n.items) (n.items as Array<unknown>).forEach((it) => { if (typeof it === "object" && it !== null && "text" in (it as object)) scanStr((it as Record<string,unknown>)["text"]); });
    if ("children" in n && n.children) (n.children as Node[]).forEach(walkNode);
    if ("template" in n && n.template) walkNode(n.template as Node);
  }
  walkNode(root);
  return result;
}

function setPath(obj: unknown, keys: string[], value: unknown): unknown {
  if (!keys || !keys.length) return value;
  const [head, ...tail] = keys;
  if (Array.isArray(obj)) {
    const arr = [...obj];
    arr[+head] = setPath(arr[+head] !== undefined ? arr[+head] : {}, tail, value);
    return arr;
  }
  const src = (obj && typeof obj === "object") ? obj as Record<string, unknown> : {};
  return { ...src, [head]: setPath(src[head], tail, value) };
}

function MockValueRow({ pathArr, value, onUpdate }: { pathArr: string[]; value: unknown; onUpdate: (p: string[], v: unknown) => void }) {
  const key    = pathArr[pathArr.length - 1];
  const isNum  = typeof value === "number";
  const isBool = typeof value === "boolean";
  const isStr  = typeof value === "string";
  const max    = isNum ? ((value as number) <= 1 ? 1 : (value as number) <= 100 ? 100 : Math.ceil((value as number) * 2 / 10) * 10) : 100;
  const step   = isNum && (value as number) <= 1 ? 0.01 : 1;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, minHeight: 26 }}>
      <span title={pathArr.join(".")} style={{ color: "var(--txt-2)", fontSize: 11, width: 72, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{key}</span>
      {isNum && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
          <input type="range" className="rng" style={{ flex: 1, minWidth: 0 }} min={0} max={max} step={step} value={value as number} onChange={(e) => onUpdate(pathArr, +e.target.value)} />
          <span style={{ color: "var(--txt)", fontSize: 11, width: 30, textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{String(value)}</span>
        </div>
      )}
      {isBool && <button type="button" className={"tog" + (value ? " on" : "")} style={{ flex: 1, fontSize: 11.5 }} onClick={() => onUpdate(pathArr, !value)}>{value ? "true" : "false"}</button>}
      {isStr  && <input className="inp" style={{ flex: 1, padding: "3px 8px", fontSize: 11 }} value={value as string} onChange={(e) => onUpdate(pathArr, e.target.value)} />}
    </div>
  );
}

function MockSection({ pathArr, data, onUpdate, expanded, setExpanded, depth }: {
  pathArr: string[]; data: unknown; onUpdate: (p: string[], v: unknown) => void;
  expanded: Record<string, boolean>; setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>; depth: number;
}) {
  const key     = pathArr[pathArr.length - 1];
  const pathStr = pathArr.join(".");
  const isExp   = expanded[pathStr] !== false;
  const isArr   = Array.isArray(data);
  return (
    <div style={{ marginBottom: depth === 0 ? 14 : 6 }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", marginBottom: isExp ? 6 : 0, userSelect: "none" }}
        onClick={() => setExpanded((e) => ({ ...e, [pathStr]: !isExp }))}
      >
        <span style={{ color: "var(--txt-3)", fontSize: 9, width: 10, textAlign: "center" }}>{isExp ? "▾" : "▸"}</span>
        <span style={{ color: "var(--accent)", fontSize: depth === 0 ? 12 : 11.5, fontWeight: depth === 0 ? 700 : 400 }}>{key}</span>
        {isArr && <span style={{ color: "var(--txt-3)", fontSize: 10, marginLeft: 3 }}>({(data as unknown[]).length})</span>}
      </div>
      {isExp && (
        <div style={{ paddingLeft: 10, borderLeft: "1px solid var(--line)", marginLeft: 4 }}>
          {isArr
            ? (data as unknown[]).map((item, idx) =>
                typeof item === "object" && item !== null
                  ? <MockSection key={idx} pathArr={[...pathArr, String(idx)]} data={item} onUpdate={onUpdate} expanded={expanded} setExpanded={setExpanded} depth={depth + 1} />
                  : <MockValueRow key={idx} pathArr={[...pathArr, String(idx)]} value={item} onUpdate={onUpdate} />
              )
            : Object.keys(data as object).filter((k) => !k.startsWith("_")).map((k) => {
                const v = (data as Record<string, unknown>)[k];
                if (v !== null && typeof v === "object") {
                  return <MockSection key={k} pathArr={[...pathArr, k]} data={v} onUpdate={onUpdate} expanded={expanded} setExpanded={setExpanded} depth={depth + 1} />;
                }
                return <MockValueRow key={k} pathArr={[...pathArr, k]} value={v} onUpdate={onUpdate} />;
              })
          }
        </div>
      )}
    </div>
  );
}

interface Props { doc: Node; mockData: unknown; onMockData: (d: unknown) => void; }

export function MockDataPanel({ doc, mockData, onMockData }: Props) {
  const [jsonMode,  setJsonMode ] = useState(false);
  const [jsonText,  setJsonText ] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [expanded,  setExpanded ] = useState<Record<string, boolean>>({});

  const bindings = findBindings(doc);

  function updateAtPath(pathArr: string[], value: unknown) {
    onMockData(setPath(mockData, pathArr, value));
  }
  function enterJson() {
    setJsonText(JSON.stringify(mockData || {}, null, 2));
    setJsonError(null);
    setJsonMode(true);
  }
  function applyJson() {
    try { onMockData(JSON.parse(jsonText)); setJsonMode(false); setJsonError(null); }
    catch (e) { setJsonError((e as Error).message); }
  }

  if (jsonMode) {
    return (
      <div className="panel-body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: "var(--txt-3)", textTransform: "uppercase", letterSpacing: "1.2px" }}>JSON Editor</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn primary" style={{ fontSize: 11, padding: "5px 11px" }} onClick={applyJson}>Apply</button>
            <button className="btn ghost"   style={{ fontSize: 11, padding: "5px 9px"  }} onClick={() => setJsonMode(false)}>Cancel</button>
          </div>
        </div>
        {jsonError && <div style={{ color: "var(--red,#f85149)", fontSize: 10.5, marginBottom: 8, padding: "5px 8px", background: "rgba(248,81,73,.08)", borderRadius: 5, border: "1px solid rgba(248,81,73,.25)" }}>{jsonError}</div>}
        <textarea className="inp ta" rows={22} value={jsonText} spellCheck={false} style={{ fontSize: 11, lineHeight: 1.6, resize: "vertical" }} onChange={(e) => setJsonText(e.target.value)} />
      </div>
    );
  }

  const data    = (mockData || {}) as Record<string, unknown>;
  const topKeys = Object.keys(data).filter((k) => !k.startsWith("_"));

  return (
    <div className="panel-body">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: "var(--txt-3)", textTransform: "uppercase", letterSpacing: "1.2px" }}>Variables</span>
        <button className="btn ghost" style={{ fontSize: 11, padding: "4px 9px" }} onClick={enterJson}>{"{ } JSON"}</button>
      </div>

      {topKeys.length === 0 && (
        <div style={{ color: "var(--txt-3)", fontSize: 11.5, textAlign: "center", padding: "28px 0" }}>
          <div style={{ fontSize: 22, marginBottom: 8, opacity: 0.5 }}>⊙</div>
          <div>No mock data</div>
          <div style={{ marginTop: 5, lineHeight: 1.6, fontSize: 11 }}>Click {"{ } JSON"} to add variables.</div>
        </div>
      )}

      {topKeys.map((k) => {
        const v = data[k];
        if (v !== null && typeof v === "object")
          return <MockSection key={k} pathArr={[k]} data={v} onUpdate={updateAtPath} expanded={expanded} setExpanded={setExpanded} depth={0} />;
        return <MockValueRow key={k} pathArr={[k]} value={v} onUpdate={updateAtPath} />;
      })}

      {bindings.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
          <div style={{ fontSize: 11, color: "var(--txt-3)", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 10 }}>
            Active bindings · {bindings.length}
          </div>
          {bindings.map((path) => {
            const val = resolveBinding(path, mockData);
            const ok  = val != null;
            return (
              <div key={path} style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6, fontSize: 11 }}>
                <span style={{ color: "var(--accent)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{"{{" + path + "}}"}</span>
                <span style={{ color: "var(--txt-3)", flexShrink: 0 }}>→</span>
                <span style={{ color: ok ? "var(--txt)" : "var(--red,#f85149)", flexShrink: 0 }}>{ok ? String(val) : "?"}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
