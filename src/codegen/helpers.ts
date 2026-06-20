import type { Node } from "../engine/model";

export function collectBindings(node: Node): string[] {
  const seen = new Set<string>(), result: string[] = [];
  function scanStr(s: unknown) {
    if (!s || typeof s !== "string") return;
    const re = /\{\{([^}]+)\}\}/g; let m;
    while ((m = re.exec(s)) !== null) {
      const p = m[1].trim();
      if (!seen.has(p)) { seen.add(p); result.push(p); }
    }
  }
  function walk(n: Node) {
    if (!n) return;
    if ("content" in n) scanStr(n.content);
    if ("label"   in n) scanStr(n.label);
    if ("title"   in n) scanStr(n.title);
    if ("valueBind" in n && n.valueBind && !seen.has(n.valueBind)) { seen.add(n.valueBind); result.push(n.valueBind); }
    if ("stateBind" in n && n.stateBind && !seen.has(n.stateBind)) { seen.add(n.stateBind); result.push(n.stateBind); }
    if ("children" in n && n.children) (n.children as Node[]).forEach(walk);
    if ("template" in n && n.template) walk(n.template as Node);
  }
  walk(node);
  return result;
}

export function collectProgressNodes(doc: Node): (Node & { type: "progress"; valueBind: string })[] {
  const nodes: (Node & { type: "progress"; valueBind: string })[] = [];
  function walk(n: Node) {
    if (!n) return;
    if (n.type === "progress" && n.valueBind) nodes.push(n as Node & { type: "progress"; valueBind: string });
    if ("children" in n && n.children) (n.children as Node[]).forEach(walk);
    if ("template" in n && n.template) walk(n.template as Node);
  }
  walk(doc);
  return nodes;
}

export const pathToVar   = (path: string) => path.replace(/\./g, "_").replace(/[^a-zA-Z0-9_]/g, "");
export const pathToCamel = (path: string) => path.split(".").map((p, i) => i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)).join("");
export const pathToSnake = (path: string) => path.replace(/\./g, "_");
export const pathToRust  = (path: string) => path.split(".").map((p) => p.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase())).join("_");

export function resolveDefault(path: string, mockData: unknown): unknown {
  if (!mockData) return null;
  const parts = path.split(".");
  let v: unknown = mockData;
  for (const p of parts) {
    if (v == null || typeof v !== "object") return null;
    v = (v as Record<string, unknown>)[p];
  }
  return v != null ? v : null;
}

export function getTitle(doc: Node): string {
  if ("title" in doc && doc.title) return String(doc.title);
  return "Terminal App";
}
