let _counter = 1;
export const uid = (p?: string) =>
  (p || "n") + "_" + (_counter++).toString(36) + Date.now().toString(36).slice(-3);

export type Align = "left" | "center" | "right";
export type BorderKind = "single" | "rounded" | "double" | "heavy" | "ascii";
export type StatusKind = "ok" | "warn" | "error" | "info" | "idle" | "active";
export type Color =
  | "fg" | "dim" | "accent" | "green" | "cyan" | "blue"
  | "magenta" | "yellow" | "red" | "border"
  | (string & {});

interface Base { id: string }

export type Col = { label: string; align?: Align } | string;

export type ListItem = string | { text: string; color?: Color; marker?: string };

export type Node =
  | ({ type: "text";       content?: string; color?: Color; bold?: boolean; dim?: boolean; wrap?: boolean; align?: Align } & Base)
  | ({ type: "badge";      content?: string; color?: Color } & Base)
  | ({ type: "kbd";        content?: string; color?: Color } & Base)
  | ({ type: "fill";       char?: string; color?: Color; dim?: boolean } & Base)
  | ({ type: "divider";    char?: string; color?: Color } & Base)
  | ({ type: "spacer";     lines?: number } & Base)
  | ({ type: "row";        children: Node[]; stack?: boolean; stackAt?: number | null } & Base)
  | ({ type: "column";     children: Node[]; gap?: number } & Base)
  | ({ type: "box";        title?: string; border?: BorderKind; borderColor?: Color; titleColor?: Color; padX?: number; padY?: number; paneWidth?: number; children: Node[] } & Base)
  | ({ type: "split";      children: Node[]; divider?: boolean; dividerChar?: string; dividerColor?: Color; border?: BorderKind } & Base)
  | ({ type: "table";      columns: Col[]; rows: string[][]; header?: boolean; rule?: boolean; headerColor?: Color; color?: Color } & Base)
  | ({ type: "list";       items: ListItem[]; marker?: string; markerColor?: Color; color?: Color } & Base)
  | ({ type: "progress";   value?: number; valueBind?: string; label?: string; labelColor?: Color; color?: Color; fillChar?: string; emptyChar?: string; showPercent?: boolean } & Base)
  | ({ type: "status";     state?: StatusKind; stateBind?: string; label?: string; color?: Color } & Base)
  | ({ type: "ascii";      content?: string; fillChar?: string; color?: Color; bold?: boolean; dim?: boolean; align?: Align; letterSpacing?: number } & Base)
  | ({ type: "collection"; source?: string; mockItems?: unknown[]; template: Node; gap?: number } & Base);

export function makeNode<T extends Node["type"]>(
  type: T,
  props: Omit<Extract<Node, { type: T }>, "id" | "type">
): Node {
  return { id: uid(type), type, ...props } as Node;
}

export function walk(
  node: Node,
  fn: (n: Node, parent: Node | null, index: number) => void,
  parent: Node | null = null,
  index = 0
): void {
  fn(node, parent, index);
  if ("children" in node && node.children) {
    (node.children as Node[]).forEach((c, i) => walk(c, fn, node, i));
  }
  if ("template" in node && node.template) {
    walk(node.template as Node, fn, node, -1);
  }
}

export function findNode(root: Node, id: string): Node | null {
  let found: Node | null = null;
  walk(root, (n) => { if (n.id === id) found = n; });
  return found;
}

export function findParent(root: Node, id: string): { parent: Node & { children: Node[] }; index: number } | null {
  let res: { parent: Node & { children: Node[] }; index: number } | null = null;
  walk(root, (n) => {
    if ("children" in n && n.children) {
      (n.children as Node[]).forEach((c, i) => {
        if (c.id === id) res = { parent: n as Node & { children: Node[] }, index: i };
      });
    }
  });
  return res;
}

export function removeNode(root: Node, id: string): Node {
  const p = findParent(root, id);
  if (p) p.parent.children.splice(p.index, 1);
  return root;
}

export function insertNode(root: Node, parentId: string, index: number, node: Node): Node {
  const parent = findNode(root, parentId) as (Node & { children?: Node[] }) | null;
  if (!parent) return root;
  if (!("children" in parent) || !parent.children) (parent as unknown as Record<string, unknown>)["children"] = [];
  (parent as Node & { children: Node[] }).children.splice(index, 0, node);
  return root;
}
