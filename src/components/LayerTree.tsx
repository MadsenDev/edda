import type { Node } from "../engine/model";

const TYPE_GLYPH: Record<string, string> = {
  column: "≡", row: "⇆", text: "T", fill: "…", box: "▢", split: "◫",
  table: "▦", list: "☰", progress: "▰", status: "●", divider: "─",
  spacer: "↕", badge: "▢", kbd: "⌘", collection: "⊞", ascii: "▟",
};

function summary(n: Node): string {
  if (n.type === "text" || n.type === "badge" || n.type === "kbd") return ("content" in n ? n.content : "") || "";
  if (n.type === "ascii")      return ("content" in n ? n.content : "") || "";
  if (n.type === "status")     return (("label" in n ? n.label : "") || ("state" in n ? n.state : "")) || "";
  if (n.type === "box")        return ("title" in n ? n.title : "") || "";
  if (n.type === "progress")   return "valueBind" in n && n.valueBind ? "{{" + n.valueBind + "}}" : (("value" in n ? n.value : 0) || 0) + "%";
  if (n.type === "fill")       return "'" + (("char" in n ? n.char : "") || ".") + "'";
  if (n.type === "collection") return "source: " + (("source" in n ? n.source : "") || "?");
  return "";
}

function TreeNode({ node, depth, selectedId, onSelect }: { node: Node; depth: number; selectedId: string | null; onSelect: (id: string) => void }) {
  const kids = "children" in node && node.children ? (node.children as Node[]) : [];
  return (
    <div>
      <div
        className={"tree-row" + (selectedId === node.id ? " on" : "")}
        style={{ paddingLeft: 8 + depth * 14 + "px" }}
        onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
      >
        <span className="tree-glyph">{TYPE_GLYPH[node.type] || "•"}</span>
        <span className="tree-type">{node.type}</span>
        <span className="tree-sum">{summary(node)}</span>
      </div>
      {kids.map((c) => <TreeNode key={c.id} node={c} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />)}
    </div>
  );
}

interface Props { doc: Node; selectedId: string | null; onSelect: (id: string) => void; }

export function LayerTree({ doc, selectedId, onSelect }: Props) {
  return (
    <div className="panel-body tree">
      <TreeNode node={doc} depth={0} selectedId={selectedId} onSelect={onSelect} />
    </div>
  );
}
