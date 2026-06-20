import { BORDERS, STATUS, asciiLines } from "./borders";
import { resolveBinding, resolveBindings } from "./bindings";
import type { Node, Color } from "./model";

export type Run = { text: string; color?: Color; bold?: boolean; dim?: boolean; id?: string };
export type Line = Run[];

const repeat = (ch: string, n: number) => (n <= 0 ? "" : ch.repeat(n));

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  if (n <= 1) return s.slice(0, n);
  return s.slice(0, n - 1) + "…";
}

const run = (text: string, opts?: Partial<Run>): Run => Object.assign({ text }, opts || {});

const lineWidth = (runs: Line) => runs.reduce((a, r) => a + r.text.length, 0);

function padLine(runs: Line, cols: number): Line {
  const w = lineWidth(runs);
  if (w < cols) return runs.concat([run(repeat(" ", cols - w))]);
  if (w > cols) {
    let acc = 0;
    const res: Line = [];
    for (const r of runs) {
      if (acc >= cols) break;
      const room = cols - acc;
      if (r.text.length <= room) { res.push(r); acc += r.text.length; }
      else { res.push(run(r.text.slice(0, room), r)); acc = cols; }
    }
    return res;
  }
  return runs;
}

function getState(node: Extract<Node, { type: "status" }>, data: unknown): string {
  if (data && node.stateBind) {
    const v = resolveBinding(node.stateBind, data);
    if (v != null) return String(v);
  }
  return node.state || "idle";
}

function inlineText(node: Node, data: unknown): string {
  switch (node.type) {
    case "text":   return resolveBindings(node.content != null ? String(node.content) : "", data);
    case "status": {
      const s = STATUS[getState(node, data) as keyof typeof STATUS] || STATUS.idle;
      return s.sym + " " + resolveBindings(node.label || "", data);
    }
    case "badge":  return "[" + resolveBindings(node.content || "", data) + "]";
    case "kbd":    return "‹" + (node.content || "") + "›";
    default:       return resolveBindings("content" in node && node.content != null ? String(node.content) : "", data);
  }
}

function inlineRuns(node: Node, data: unknown): Line {
  if (node.type === "status") {
    const state = getState(node, data);
    const s = STATUS[state as keyof typeof STATUS] || STATUS.idle;
    const label = resolveBindings(node.label || "", data);
    return [
      run(s.sym, { color: (node.color || s.color) as Color, id: node.id }),
      run(" " + label, { color: "fg", id: node.id }),
    ];
  }
  const t = inlineText(node, data);
  const color = ("color" in node ? node.color : undefined) as Color | undefined;
  const bold  = "bold" in node ? !!node.bold : false;
  const dim   = "dim"  in node ? !!node.dim  : false;
  return [run(t, { color: color || "fg", bold, dim, id: node.id })];
}

const inlineMin = (node: Node) => inlineText(node, null).length;

export function render(node: Node, cols: number, theme: { border?: string }, data: unknown): Line[] {
  cols = Math.max(1, Math.floor(cols));
  return renderBlock(node, cols, theme, data).map((l) => padLine(l, cols));
}

export function renderBlock(node: Node, cols: number, theme: { border?: string }, data: unknown): Line[] {
  switch (node.type) {
    case "collection": return renderCollection(node, cols, theme, data);
    case "ascii":      return renderAscii(node, cols, theme, data);
    case "column": {
      let out: Line[] = [];
      const gap = node.gap || 0;
      (node.children || []).forEach((c, i) => {
        if (i > 0 && gap) for (let g = 0; g < gap; g++) out.push([]);
        out = out.concat(renderBlock(c, cols, theme, data));
      });
      return out;
    }
    case "row":      return renderRow(node, cols, theme, data);
    case "text":     return renderText(node, cols, theme, data);
    case "divider":  return [[run(repeat(node.char || "─", cols), { color: (node.color || "border") as Color, dim: true })]];
    case "spacer":   return Array.from({ length: node.lines || 1 }, () => []);
    case "progress": return renderProgress(node, cols, theme, data);
    case "box":      return renderBox(node, cols, theme, data);
    case "split":    return renderSplit(node, cols, theme, data);
    case "table":    return renderTable(node, cols, theme, data);
    case "list":     return renderList(node, cols, theme, data);
    case "status":   return [inlineRuns(node, data)];
    case "badge":
    case "kbd":
    case "fill": {
      const r = inlineRuns(node, data);
      return [r.length ? r : [run("")]];
    }
    default: return [[run(inlineText(node as Node, data), { id: (node as Node & { id: string }).id })]];
  }
}

function renderCollection(node: Extract<Node, { type: "collection" }>, cols: number, theme: { border?: string }, data: unknown): Line[] {
  const arr = (data && node.source) ? resolveBinding(node.source, data) : null;
  const items: unknown[] = Array.isArray(arr) ? arr : (node.mockItems || []);
  if (!node.template) return [[run("(collection: no template)", { color: "dim", id: node.id })]];
  if (!items.length)  return [[run("(empty: " + (node.source || "?") + ")", { color: "dim", id: node.id })]];
  let out: Line[] = [];
  const gap = node.gap != null ? node.gap : 0;
  items.forEach((item, idx) => {
    if (idx > 0 && gap) for (let g = 0; g < gap; g++) out.push([]);
    const itemData = Object.assign({}, data || {}, { item, _index: idx });
    out = out.concat(renderBlock(node.template, cols, theme, itemData));
  });
  return out;
}

function renderAscii(node: Extract<Node, { type: "ascii" }>, cols: number, _theme: unknown, data: unknown): Line[] {
  const text = resolveBindings(node.content != null ? String(node.content) : "", data);
  const fill = node.fillChar || "█";
  const lines = asciiLines(text, fill, node.letterSpacing);
  const align = node.align || "left";
  return lines.map((line) => {
    const trimmed = line.replace(/\s+$/, "");
    let pad = 0;
    if (align === "center") pad = Math.max(0, Math.floor((cols - trimmed.length) / 2));
    else if (align === "right") pad = Math.max(0, cols - trimmed.length);
    const lead: Line = pad ? [run(repeat(" ", pad))] : [];
    return lead.concat([run(trimmed, { color: (node.color || "accent") as Color, bold: !!node.bold, dim: !!node.dim, id: node.id })]);
  });
}

function renderText(node: Extract<Node, { type: "text" }>, cols: number, _theme: unknown, data: unknown): Line[] {
  const txt = resolveBindings(node.content != null ? String(node.content) : "", data);
  const align = node.align || "left";
  let lines: string[];
  if (node.wrap) {
    lines = [];
    txt.split(/\s+/).forEach((w) => {
      if (!lines.length) { lines.push(w); return; }
      const last = lines[lines.length - 1];
      if ((last + " " + w).length <= cols) lines[lines.length - 1] = last + " " + w;
      else lines.push(w);
    });
    if (!lines.length) lines.push("");
  } else {
    lines = [truncate(txt, cols)];
  }
  return lines.map((ln) => {
    let pad = 0;
    if (align === "right")  pad = Math.max(0, cols - ln.length);
    if (align === "center") pad = Math.max(0, Math.floor((cols - ln.length) / 2));
    const lead: Line = pad ? [run(repeat(" ", pad))] : [];
    return lead.concat([run(ln, { color: (node.color || "fg") as Color, bold: !!node.bold, dim: !!node.dim, id: node.id })]);
  });
}

function renderRow(node: Extract<Node, { type: "row" }>, cols: number, theme: { border?: string }, data: unknown): Line[] {
  const children  = node.children || [];
  const fills     = children.filter((c) => c.type === "fill");
  const fixedNodes= children.filter((c) => c.type !== "fill");
  const fixedWidth= fixedNodes.reduce((a, c) => a + inlineMin(c), 0);
  const minNeeded = fixedWidth + fills.length;
  const stackAt   = node.stackAt != null ? node.stackAt : null;
  const shouldStack = node.stack === true ||
    (node.stack !== false && (stackAt != null ? cols < stackAt
      : (fills.length > 0 ? cols < minNeeded : fixedWidth > cols)));
  if (shouldStack && fixedNodes.length > 1) {
    let out: Line[] = [];
    fixedNodes.forEach((c) => { out = out.concat(renderBlock(c, cols, theme, data)); });
    return out;
  }
  let runs: Line = [];
  if (!fills.length) {
    children.forEach((c) => { runs = runs.concat(inlineRuns(c, data)); });
    return [runs];
  }
  const totalFill = Math.max(fills.length, cols - fixedWidth);
  const per = Math.floor(totalFill / fills.length);
  let rem = totalFill - per * fills.length;
  children.forEach((c) => {
    if (c.type === "fill") {
      const w = per + (rem > 0 ? 1 : 0); if (rem > 0) rem--;
      runs = runs.concat([run(repeat(c.char || ".", Math.max(0, w)), { color: (c.color || "border") as Color, dim: c.dim !== false, id: c.id })]);
    } else {
      runs = runs.concat(inlineRuns(c, data));
    }
  });
  return [runs];
}

function renderProgress(node: Extract<Node, { type: "progress" }>, cols: number, _theme: unknown, data: unknown): Line[] {
  let value = node.value != null ? node.value : 0;
  if (data && node.valueBind) {
    const v = resolveBinding(node.valueBind, data);
    if (v != null) value = +v;
  }
  value = Math.max(0, Math.min(100, value));
  const label   = resolveBindings(node.label || "", data);
  const pct     = node.showPercent === false ? "" : (" " + String(Math.round(value)).padStart(3) + "%");
  const trackW  = Math.max(4, cols - label.length - pct.length);
  const filled  = Math.round((value / 100) * trackW);
  const fch = node.fillChar  || "█";
  const ech = node.emptyChar || "░";
  const r: Line = [];
  if (label) r.push(run(label, { color: (node.labelColor || "fg") as Color, id: node.id }));
  r.push(run(repeat(fch, filled),          { color: (node.color || "accent") as Color, id: node.id }));
  r.push(run(repeat(ech, trackW - filled), { color: "border", dim: true, id: node.id }));
  if (pct) r.push(run(pct, { color: (node.color || "accent") as Color, bold: true, id: node.id }));
  return [r];
}

function renderList(node: Extract<Node, { type: "list" }>, cols: number, _theme: unknown, data: unknown): Line[] {
  const marker = node.marker != null ? node.marker : "•";
  return (node.items || []).map((it) => {
    const raw   = typeof it === "string" ? it : (it.text || "");
    const text  = resolveBindings(raw, data);
    const mk    = typeof it === "object" && "marker" in it && it.marker != null ? it.marker : marker;
    const color = typeof it === "object" && "color" in it && it.color ? it.color as Color : (node.color || "fg") as Color;
    const mRun: Line = mk ? [run(mk + " ", { color: (node.markerColor || "accent") as Color, id: node.id })] : [];
    return mRun.concat([run(truncate(text, cols - (mk ? mk.length + 1 : 0)), { color, id: node.id })]);
  });
}

function alignCell(s: string, w: number, al: string): string {
  if (s.length >= w) return s.slice(0, w);
  const pad = w - s.length;
  if (al === "right")  return repeat(" ", pad) + s;
  if (al === "center") return repeat(" ", Math.floor(pad / 2)) + s + repeat(" ", Math.ceil(pad / 2));
  return s + repeat(" ", pad);
}

function renderTable(node: Extract<Node, { type: "table" }>, cols: number, _theme: unknown, data: unknown): Line[] {
  const columns = node.columns || [];
  const rows = (node.rows || []).map((r) =>
    r.map((cell) => (typeof cell === "string" && data) ? resolveBindings(cell, data) : cell)
  );
  const n = columns.length;
  const natural = columns.map((c, i) => {
    let w = String(typeof c === "object" ? c.label || c : c).length;
    rows.forEach((r) => { w = Math.max(w, String(r[i] != null ? r[i] : "").length); });
    return w;
  });
  const gap = 2;
  let total = natural.reduce((a, b) => a + b, 0) + gap * (n - 1);
  if (total > cols) {
    let over = total - cols;
    for (let i = natural.length - 1; i >= 0 && over > 0; i--) {
      const can = Math.max(3, natural[i] - over);
      over -= natural[i] - can; natural[i] = can;
    }
  }
  const out: Line[] = [];
  if (node.header !== false) {
    let hr: Line = [];
    columns.forEach((c, i) => {
      const label = typeof c === "object" ? (c.label || "") : String(c);
      const al    = typeof c === "object" && c.align ? c.align : "left";
      hr = hr.concat([run(alignCell(label, natural[i], al), { color: (node.headerColor || "accent") as Color, bold: true, id: node.id })]);
      if (i < n - 1) hr.push(run(repeat(" ", gap)));
    });
    out.push(hr);
    if (node.rule !== false) {
      let rr: Line = [];
      natural.forEach((w, i) => {
        rr.push(run(repeat("─", w), { color: "border", dim: true, id: node.id }));
        if (i < n - 1) rr.push(run(repeat(" ", gap)));
      });
      out.push(rr);
    }
  }
  rows.forEach((r) => {
    let line: Line = [];
    columns.forEach((c, i) => {
      const al = typeof c === "object" && c.align ? c.align : "left";
      line = line.concat([run(alignCell(truncate(String(r[i] != null ? r[i] : ""), natural[i]), natural[i], al), { color: (node.color || "fg") as Color, id: node.id })]);
      if (i < n - 1) line.push(run(repeat(" ", gap)));
    });
    out.push(line);
  });
  return out;
}

function renderBox(node: Extract<Node, { type: "box" }>, cols: number, theme: { border?: string }, data: unknown): Line[] {
  const B    = BORDERS[(node.border || theme.border || "single") as keyof typeof BORDERS] || BORDERS.single;
  const padX = node.padX != null ? node.padX : 1;
  const padY = node.padY != null ? node.padY : 0;
  const bc   = (node.borderColor || "border") as Color;
  const innerW = Math.max(1, cols - 2 - padX * 2);
  const child  = node.children && node.children.length === 1 ? node.children[0]
    : { type: "column" as const, children: node.children || [], id: node.id + "_inner" };
  const innerLines = renderBlock(child, innerW, theme, data).map((l) => padLine(l, innerW));
  const out: Line[] = [];
  const titleStr = node.title ? " " + resolveBindings(node.title, data) + " " : "";
  let top: Line = [run(B.tl, { color: bc, id: node.id })];
  if (titleStr) {
    top.push(run(B.h,     { color: bc, id: node.id }));
    top.push(run(titleStr,{ color: (node.titleColor || "accent") as Color, bold: true, id: node.id }));
    top.push(run(repeat(B.h, Math.max(0, cols - 3 - titleStr.length)), { color: bc, id: node.id }));
  } else {
    top.push(run(repeat(B.h, cols - 2), { color: bc, id: node.id }));
  }
  top.push(run(B.tr, { color: bc, id: node.id }));
  out.push(top);
  const blank = (): Line => [run(B.v, { color: bc, id: node.id }), run(repeat(" ", cols - 2)), run(B.v, { color: bc, id: node.id })];
  for (let i = 0; i < padY; i++) out.push(blank());
  innerLines.forEach((ln) => {
    out.push([run(B.v, { color: bc, id: node.id }), run(repeat(" ", padX))].concat(ln).concat([run(repeat(" ", padX)), run(B.v, { color: bc, id: node.id })]));
  });
  for (let i = 0; i < padY; i++) out.push(blank());
  out.push([run(B.bl, { color: bc, id: node.id }), run(repeat(B.h, cols - 2), { color: bc, id: node.id }), run(B.br, { color: bc, id: node.id })]);
  return out;
}

function renderSplit(node: Extract<Node, { type: "split" }>, cols: number, theme: { border?: string }, data: unknown): Line[] {
  const B     = BORDERS[(node.border || theme.border || "single") as keyof typeof BORDERS] || BORDERS.single;
  const panes = node.children || [];
  const n     = panes.length;
  if (!n) return [[]];
  const dividers  = node.divider === false ? 0 : (n - 1);
  const dchar     = node.divider === false ? "" : (node.dividerChar || B.v);
  const avail     = cols - dividers;
  const fixed     = panes.map((p) => ("paneWidth" in p && p.paneWidth != null ? (p as { paneWidth: number }).paneWidth : null));
  const fixedSum  = fixed.reduce<number>((a: number, w) => a + (w ?? 0), 0);
  const flexCount = fixed.filter((w) => w == null).length;
  const flexEach  = flexCount ? Math.floor((avail - fixedSum) / flexCount) : 0;
  let widths = fixed.map((w) => (w == null ? flexEach : w));
  let rem = avail - widths.reduce((a, b) => a + b, 0);
  for (let i = panes.length - 1; i >= 0 && rem > 0; i--) {
    if (fixed[i] == null) { widths[i] += rem; rem = 0; }
  }
  const rendered = panes.map((p, i) => renderBlock(p, widths[i], theme, data).map((l) => padLine(l, widths[i])));
  const height   = Math.max(...rendered.map((r) => r.length));
  const out: Line[] = [];
  for (let y = 0; y < height; y++) {
    let line: Line = [];
    for (let i = 0; i < n; i++) {
      line = line.concat(rendered[i][y] || [run(repeat(" ", widths[i]))]);
      if (dchar && i < n - 1) line.push(run(dchar, { color: (node.dividerColor || "border") as Color, id: node.id }));
    }
    out.push(line);
  }
  return out;
}
