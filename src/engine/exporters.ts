import { render } from "./render";
import type { Node } from "./model";

export function modelToJSON(node: Node): string {
  const clean = (n: Node): unknown => {
    const o: Record<string, unknown> = { type: n.type };
    (Object.keys(n) as (keyof Node)[]).forEach((k) => {
      if (k !== "id" && k !== "type" && k !== "children" && k !== "template") {
        o[k] = n[k as keyof typeof n];
      }
    });
    if ("children" in n && n.children) o.children = (n.children as Node[]).map(clean);
    if ("template" in n && n.template) o.template = clean(n.template as Node);
    return o;
  };
  return JSON.stringify(clean(node), null, 2);
}

export function linesToText(lines: { text: string }[][]): string {
  return lines.map((l) => l.map((r) => r.text).join("").replace(/\s+$/g, "")).join("\n");
}

export function exportPlain(node: Node, cols: number, theme: { border?: string }, data: unknown): string {
  return linesToText(render(node, cols, theme, data));
}

export function exportMarkdown(node: Node, cols: number, theme: { border?: string }, data: unknown): string {
  return "```\n" + exportPlain(node, cols, theme, data) + "\n```";
}
