import { useState, useRef, useEffect, useMemo } from "react";
import { findNode, removeNode, walk, uid } from "../engine/model";
import { render } from "../engine/render";
import { cliDeploy, tuiDashboard, SAMPLES, AI_PRESETS } from "../samples";
import type { Node } from "../engine/model";

export type Palette = {
  fg: string; dim: string; accent: string; green: string; cyan: string;
  blue: string; magenta: string; yellow: string; red: string; border: string; bg: string;
};
export type Theme = { border?: string; _lastUnicode?: string };
export type Mode = "cli" | "tui";

export const DEFAULT_PALETTE: Palette = {
  fg: "#e6e8ec", dim: "#8b909c", accent: "#5fd7a0",
  green: "#56d364", cyan: "#39c5cf", blue: "#539bf5", magenta: "#f778ba",
  yellow: "#e3b341", red: "#f85149", border: "#2b313b", bg: "#0d1117",
};

const DEFAULT_MOCK_DATA = {
  server:     { cpu: 42, memory: 68, disk: 23, net: 88, name: "prod-eu-1", statusState: "ok" },
  deployment: { env: "Production", branch: "main", commit: "9f3c1a2", url: "edda.example.com", duration: "2m 31s", build: 100, upload: 100, warmup: 64 },
  services:   [
    { name: "api",    status: "ok",    replicas: 3, cpu: 12 },
    { name: "web",    status: "ok",    replicas: 2, cpu: 8  },
    { name: "worker", status: "warn",  replicas: 1, cpu: 71 },
    { name: "mailer", status: "error", replicas: 0, cpu: 0  },
  ],
};

const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));

const WIDTHS = [
  { c: 40,  label: "narrow" },
  { c: 80,  label: "80×24"  },
  { c: 120, label: "120×30" },
  { c: 160, label: "wide"   },
];

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem("edda_state_v2") || "null");
    if (s && s.cliDoc && s.tuiDoc) return s;
  } catch (_) {}
  return null;
}

function loadMockData() {
  try {
    const s = JSON.parse(localStorage.getItem("edda_mock_v1") || "null");
    if (s && typeof s === "object") return s;
  } catch (_) {}
  return DEFAULT_MOCK_DATA;
}

export { WIDTHS };

export function useEddaState() {
  const saved = loadState();

  const [mode,        setMode       ] = useState<Mode>(saved?.mode ?? "cli");
  const [cliDoc,      setCliDoc     ] = useState<Node>(() => saved?.cliDoc ?? cliDeploy());
  const [tuiDoc,      setTuiDoc     ] = useState<Node>(() => saved?.tuiDoc ?? tuiDashboard());
  const [sampleLabel, setSampleLabel] = useState<{ cli: string; tui: string }>(
    saved?.sampleLabel ?? { cli: "Deployment summary", tui: "Monitoring dashboard" }
  );
  const [projectName, setProjectName] = useState<string>(saved?.projectName ?? "Deployment summary");
  const [selectedId,  setSelectedId ] = useState<string | null>(null);
  const [cols,        setCols       ] = useState<number>(saved?.cols ?? 80);
  const [theme,       setTheme      ] = useState<Theme>(saved?.theme ?? { border: "single" });
  const [palette,     setPalette    ] = useState<Palette>(saved?.palette ?? DEFAULT_PALETTE);
  const [mockData,    setMockData   ] = useState<unknown>(loadMockData);
  const [rightTab,    setRightTab   ] = useState<string>("inspect");
  const [exportOpen,  setExportOpen ] = useState(false);
  const [aiBusy,      setAiBusy     ] = useState(false);
  const [fontSize,    setFontSize   ] = useState(16);
  const histories = useRef<{ cli: Node[]; tui: Node[] }>({ cli: [], tui: [] });

  const doc       = mode === "cli" ? cliDoc : tuiDoc;
  const setDocRaw = mode === "cli" ? setCliDoc : setTuiDoc;

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem("edda_state_v2", JSON.stringify({ mode, cliDoc, tuiDoc, sampleLabel, cols, theme, palette, projectName }));
      } catch (_) {}
    }, 200);
    return () => clearTimeout(t);
  }, [mode, cliDoc, tuiDoc, sampleLabel, cols, theme, palette, projectName]);

  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem("edda_mock_v1", JSON.stringify(mockData)); } catch (_) {}
    }, 200);
    return () => clearTimeout(t);
  }, [mockData]);

  function mutate(fn: (d: Node) => void) {
    histories.current[mode].push(clone(doc));
    if (histories.current[mode].length > 60) histories.current[mode].shift();
    const next = clone(doc);
    fn(next);
    setDocRaw(next);
  }

  function undo() {
    const stack = histories.current[mode];
    if (!stack.length) return;
    setDocRaw(stack.pop()!);
  }

  const selectedNode = useMemo(
    () => (selectedId ? findNode(doc, selectedId) : null),
    [doc, selectedId]
  );

  function updateNode(id: string, patch: Partial<Node>) {
    mutate((d) => { const n = findNode(d, id); if (n) Object.assign(n, patch); });
  }

  function reid(node: Node) {
    node.id = uid(node.type);
    if ("children" in node && node.children) (node.children as Node[]).forEach(reid);
    if ("template" in node && node.template) reid(node.template as Node);
  }

  function action(kind: string, id: string) {
    if (kind === "del") {
      mutate((d) => removeNode(d, id));
      setSelectedId(null);
      return;
    }
    if (kind === "up" || kind === "down") {
      mutate((d) => {
        let pp: { parent: Node & { children: Node[] }; index: number } | null = null;
        walk(d, (n) => {
          if ("children" in n && n.children) {
            (n.children as Node[]).forEach((c, i) => { if (c.id === id) pp = { parent: n as Node & { children: Node[] }, index: i }; });
          }
        });
        if (!pp) return;
        const arr = (pp as { parent: { children: Node[] }; index: number }).parent.children;
        const i   = (pp as { parent: { children: Node[] }; index: number }).index;
        const j   = kind === "up" ? i - 1 : i + 1;
        if (j < 0 || j >= arr.length) return;
        [arr[i], arr[j]] = [arr[j], arr[i]];
      });
    } else if (kind === "dup") {
      mutate((d) => {
        let pp: { parent: Node & { children: Node[] }; index: number } | null = null;
        walk(d, (n) => {
          if ("children" in n && n.children) {
            (n.children as Node[]).forEach((c, i) => { if (c.id === id) pp = { parent: n as Node & { children: Node[] }, index: i }; });
          }
        });
        if (!pp) return;
        const { parent, index } = pp as { parent: Node & { children: Node[] }; index: number };
        const copy = clone(parent.children[index]);
        reid(copy);
        parent.children.splice(index + 1, 0, copy);
      });
    }
  }

  function rootColumnId(d: Node): string {
    if (d.type === "column") return d.id;
    let target = d.id;
    walk(d, (n) => { if (n.type === "column" && target === d.id) target = n.id; });
    return target;
  }

  function createDefault(type: string): Node {
    const mk = (t: Node["type"], props: object) => ({ id: uid(t), type: t, ...props }) as Node;
    switch (type) {
      case "text":       return mk("text",     { content: "Text", color: "fg" });
      case "heading":    return mk("text",     { content: "Heading", color: "fg", bold: true });
      case "divider":    return mk("divider",  { char: "─", color: "border" });
      case "spacer":     return mk("spacer",   { lines: 1 });
      case "badge":      return mk("badge",    { content: "NEW", color: "accent" });
      case "kbd":        return mk("kbd",      { content: "⌘K", color: "fg" });
      case "row":        return mk("row",      { children: [mk("text", { content: "Label", color: "dim" }), mk("fill", { char: ".", color: "border" }), mk("text", { content: "Value", color: "fg" })] });
      case "column":     return mk("column",   { children: [mk("text", { content: "Item one", color: "fg" }), mk("text", { content: "Item two", color: "dim" })] });
      case "fill":       return mk("fill",     { char: ".", color: "border" });
      case "box":        return mk("box",      { title: "Panel", border: "single", borderColor: "border", padX: 1, children: [mk("column", { children: [mk("text", { content: "Contents", color: "fg" })] })] });
      case "split":      return mk("split",    { divider: true, children: [mk("box", { title: "left", border: "single", borderColor: "border", padX: 1, paneWidth: 16, children: [mk("text", { content: "nav", color: "dim" })] }), mk("box", { title: "right", border: "single", borderColor: "border", padX: 1, children: [mk("text", { content: "content", color: "fg" })] })] });
      case "table":      return mk("table",    { headerColor: "accent", columns: [{ label: "KEY" }, { label: "VALUE", align: "right" }], rows: [["one", "1"], ["two", "2"]] });
      case "list":       return mk("list",     { marker: "•", markerColor: "accent", items: [{ text: "First item", color: "fg" }, { text: "Second item", color: "fg" }] });
      case "progress":   return mk("progress", { value: 60, fillChar: "█", emptyChar: "░", color: "accent", label: "Loading ", labelColor: "dim", showPercent: true });
      case "status":     return mk("status",   { state: "ok", label: "online" });
      case "ascii":      return mk("ascii",    { content: "EDDA", fillChar: "█", color: "accent", align: "left" });
      case "collection": return mk("collection", {
        source: "items",
        mockItems: [{ name: "alpha", status: "ok", value: "12" }, { name: "beta", status: "warn", value: "87" }],
        template: mk("row", { children: [
          mk("status", { stateBind: "item.status" }),
          mk("text",   { content: " {{item.name}}", color: "fg" }),
          mk("fill",   { char: " " }),
          mk("text",   { content: "{{item.value}}", color: "dim" }),
        ]}),
      });
      default: return mk("text", { content: "Text", color: "fg" });
    }
  }

  function onDropNew(type: string, idx: number) {
    const node = createDefault(type);
    mutate((d) => {
      if (d.type === "column") {
        (d as Node & { children: Node[] }).children.splice(idx, 0, node);
      } else {
        const colId = rootColumnId(d);
        const col = findNode(d, colId) as (Node & { children?: Node[] }) | null;
        if (col) {
          if (!("children" in col)) (col as unknown as Record<string, unknown>)["children"] = [];
          (col as Node & { children: Node[] }).children.push(node);
        }
      }
    });
    setSelectedId(node.id);
    setRightTab("inspect");
  }

  function onMove(moveId: string, idx: number) {
    mutate((d) => {
      if (d.type !== "column") return;
      const children = (d as Node & { children: Node[] }).children;
      const cur = children.findIndex((c) => c.id === moveId);
      if (cur < 0) return;
      const [item] = children.splice(cur, 1);
      children.splice(cur < idx ? idx - 1 : idx, 0, item);
    });
  }

  function appendNew(type: string) {
    onDropNew(type, doc.type === "column" ? ((doc as Node & { children: Node[] }).children || []).length : 0);
  }

  function newCanvas() {
    const empty = (): Node => ({ id: uid("column"), type: "column", children: [] });
    setCliDoc(empty());
    setTuiDoc(empty());
    setSampleLabel({ cli: "", tui: "" });
    setProjectName("Untitled");
    setSelectedId(null);
    histories.current = { cli: [], tui: [] };
  }

  function loadSample(m: Mode, key: string) {
    const def = SAMPLES[m][key];
    if (!def) return;
    if (m === "cli") setCliDoc(def.build());
    else setTuiDoc(def.build());
    if (def.mockData) setMockData(def.mockData);
    setSampleLabel((s) => ({ ...s, [m]: def.label }));
    setProjectName(def.label);
    setMode(m);
    setSelectedId(null);
    histories.current[m] = [];
  }

  function onAI(prompt: string) {
    setAiBusy(true);
    const lower  = prompt.toLowerCase();
    const preset = AI_PRESETS.find((p) => p.match.some((m) => lower.includes(m))) || AI_PRESETS[0];
    setTimeout(() => {
      if (preset.mode === "cli") setCliDoc(preset.build());
      else setTuiDoc(preset.build());
      if (preset.mockData) setMockData(preset.mockData);
      setMode(preset.mode);
      setSampleLabel((s) => ({ ...s, [preset.mode]: "AI · " + prompt.slice(0, 28) }));
      setProjectName("AI · " + prompt.slice(0, 28));
      setSelectedId(null);
      histories.current[preset.mode] = [];
      setAiBusy(false);
    }, 850);
  }

  const lineCount = useMemo(
    () => render(doc, cols, theme, mockData).length,
    [doc, cols, theme, mockData]
  );

  return {
    mode, setMode,
    doc, cliDoc, tuiDoc,
    projectName, setProjectName,
    sampleLabel, setSampleLabel,
    selectedId, setSelectedId,
    selectedNode,
    cols, setCols,
    theme, setTheme,
    palette, setPalette,
    mockData, setMockData,
    rightTab, setRightTab,
    exportOpen, setExportOpen,
    aiBusy,
    fontSize, setFontSize,
    lineCount,
    mutate, undo, updateNode, action,
    onDropNew, onMove, appendNew,
    loadSample, onAI, newCanvas,
    createDefault,
  };
}
