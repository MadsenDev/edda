import { describe, expect, test } from "bun:test";
import { makeNode, walk, findNode, findParent, removeNode, insertNode, uid } from "../src/engine/model";
import { resolveBinding, resolveBindings } from "../src/engine/bindings";
import { render } from "../src/engine/render";
import { exportPlain, exportMarkdown, modelToJSON } from "../src/engine/exporters";

// ---- uid ----------------------------------------------------------------

describe("uid", () => {
  test("returns a string with prefix", () => {
    const id = uid("text");
    expect(typeof id).toBe("string");
    expect(id.startsWith("text_")).toBe(true);
  });

  test("each call returns a unique value", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid("box")));
    expect(ids.size).toBe(100);
  });
});

// ---- makeNode -----------------------------------------------------------

describe("makeNode", () => {
  test("assigns an id", () => {
    const n = makeNode("text", { content: "hello" });
    expect(n.id).toBeTruthy();
    expect(n.type).toBe("text");
  });

  test("text node carries content", () => {
    const n = makeNode("text", { content: "world" });
    if (n.type === "text") {
      expect(n.content).toBe("world");
    }
  });
});

// ---- walk ---------------------------------------------------------------

describe("walk", () => {
  test("visits every node", () => {
    const root = makeNode("column", {
      children: [
        makeNode("text", { content: "a" }),
        makeNode("text", { content: "b" }),
      ],
    });
    const visited: string[] = [];
    walk(root, (n) => { if (n.type === "text") visited.push((n as { content?: string }).content ?? ""); });
    expect(visited).toContain("a");
    expect(visited).toContain("b");
  });
});

// ---- findNode -----------------------------------------------------------

describe("findNode", () => {
  test("returns the target node by id", () => {
    const child = makeNode("text", { content: "find me" });
    const root = makeNode("column", { children: [child] });
    const result = findNode(root, child.id);
    expect(result?.id).toBe(child.id);
  });

  test("returns null when id missing", () => {
    const root = makeNode("text", { content: "x" });
    expect(findNode(root, "nonexistent")).toBeNull();
  });
});

// ---- findParent ---------------------------------------------------------

describe("findParent", () => {
  test("finds the parent and index of a child", () => {
    const child = makeNode("text", { content: "child" });
    const root  = makeNode("column", { children: [child] });
    const res   = findParent(root, child.id);
    expect(res).not.toBeNull();
    expect(res?.index).toBe(0);
  });
});

// ---- removeNode ---------------------------------------------------------

describe("removeNode", () => {
  test("removes a child from its parent", () => {
    const child = makeNode("text", { content: "remove me" });
    const root  = makeNode("column", { children: [child] });
    removeNode(root, child.id);
    if (root.type === "column") {
      expect(root.children.find((c) => c.id === child.id)).toBeUndefined();
    }
  });
});

// ---- insertNode ---------------------------------------------------------

describe("insertNode", () => {
  test("inserts a node at a target", () => {
    const anchor = makeNode("text", { content: "anchor" });
    const root   = makeNode("column", { children: [anchor] });
    const newNode = makeNode("text", { content: "inserted" });
    insertNode(root, root.id, 1, newNode);
    if (root.type === "column") {
      expect(root.children[1]?.id).toBe(newNode.id);
    }
  });
});

// ---- bindings -----------------------------------------------------------

describe("resolveBinding", () => {
  const data = { user: { name: "Alice", score: 99 }, tags: ["a", "b"] };

  test("resolves dot-path", () => {
    expect(resolveBinding("user.name", data)).toBe("Alice");
  });

  test("resolves nested numeric index", () => {
    expect(resolveBinding("tags.1", data)).toBe("b");
  });

  test("returns undefined for missing path", () => {
    expect(resolveBinding("user.missing", data)).toBeUndefined();
  });

  test("returns undefined for null data", () => {
    expect(resolveBinding("user.name", null)).toBeUndefined();
  });
});

describe("resolveBindings", () => {
  const data = { env: "production", version: "1.0.0" };

  test("replaces {{tokens}} in a string", () => {
    expect(resolveBindings("env: {{env}} v{{version}}", data)).toBe("env: production v1.0.0");
  });

  test("leaves unresolved tokens as-is", () => {
    expect(resolveBindings("{{missing}}", data)).toBe("{{missing}}");
  });

  test("passes through a string with no tokens", () => {
    expect(resolveBindings("hello world", data)).toBe("hello world");
  });
});

// ---- render -------------------------------------------------------------

describe("render", () => {
  const theme  = { border: "single" };
  const data   = {};

  test("renders a text node into lines", () => {
    const doc   = makeNode("text", { content: "hello" });
    const lines = render(doc, 40, theme, data);
    expect(lines.length).toBeGreaterThan(0);
    const flat = lines.flat().map((r) => r.text).join("");
    expect(flat).toContain("hello");
  });

  test("each line is padded to cols width", () => {
    const doc   = makeNode("text", { content: "hi" });
    const cols  = 40;
    const lines = render(doc, cols, theme, data);
    for (const line of lines) {
      const w = line.reduce((a, r) => a + r.text.length, 0);
      expect(w).toBe(cols);
    }
  });

  test("renders a column with children", () => {
    const doc = makeNode("column", {
      children: [
        makeNode("text", { content: "line one" }),
        makeNode("text", { content: "line two" }),
      ],
    });
    const lines = render(doc, 40, theme, data);
    const flat  = lines.flat().map((r) => r.text).join("");
    expect(flat).toContain("line one");
    expect(flat).toContain("line two");
  });

  test("renders a box with border and title", () => {
    const doc = makeNode("box", {
      title: "MyBox",
      border: "single",
      borderColor: "border",
      padX: 1,
      children: [makeNode("text", { content: "inner" })],
    });
    const lines = render(doc, 40, theme, data);
    const flat  = lines.flat().map((r) => r.text).join("");
    expect(flat).toContain("MyBox");
    expect(flat).toContain("inner");
  });

  test("resolves data bindings in render", () => {
    const doc  = makeNode("text", { content: "{{greeting}}" });
    const lines = render(doc, 40, theme, { greeting: "Hi!" });
    const flat  = lines.flat().map((r) => r.text).join("");
    expect(flat).toContain("Hi!");
  });
});

// ---- exporters ----------------------------------------------------------

describe("exportPlain", () => {
  test("returns a non-empty string", () => {
    const doc = makeNode("text", { content: "plain export" });
    const out = exportPlain(doc, 40, { border: "single" }, {});
    expect(typeof out).toBe("string");
    expect(out).toContain("plain export");
  });
});

describe("exportMarkdown", () => {
  test("wraps output in a code fence", () => {
    const doc = makeNode("text", { content: "md export" });
    const out = exportMarkdown(doc, 40, { border: "single" }, {});
    expect(out.startsWith("```")).toBe(true);
    expect(out.endsWith("```")).toBe(true);
  });
});

describe("modelToJSON", () => {
  test("returns valid JSON matching the node", () => {
    const doc = makeNode("text", { content: "json export" });
    const json = JSON.parse(modelToJSON(doc));
    expect(json.type).toBe("text");
  });
});
