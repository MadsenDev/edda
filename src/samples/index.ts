import { makeNode } from "../engine/model";
import type { Node } from "../engine/model";

const mk = makeNode;
const T   = (content: string, o?: object) => mk("text",    Object.assign({ content }, o || {}) as Parameters<typeof mk<"text">>[1]);
const F   = (char?: string, o?: object)   => mk("fill",    Object.assign({ char: char || "." }, o || {}) as Parameters<typeof mk<"fill">>[1]);
const ROW = (children: Node[], o?: object)=> mk("row",     Object.assign({ children }, o || {}) as Parameters<typeof mk<"row">>[1]);
const COL = (children: Node[], o?: object)=> mk("column",  Object.assign({ children }, o || {}) as Parameters<typeof mk<"column">>[1]);
const SP  = (lines?: number)              => mk("spacer",  { lines: lines || 1 });
const DIV = (char?: string, o?: object)   => mk("divider", Object.assign({ char: char || "─" }, o || {}) as Parameters<typeof mk<"divider">>[1]);
const ST  = (state: string, label: string)=> mk("status",  { state, label } as Parameters<typeof mk<"status">>[1]);
const KV  = (k: string, v: string, vColor?: string) => ROW([T(k, { color: "dim" }), F(".", { color: "border" }), T(v, { color: vColor || "fg" })]);

export const deployMockData = {
  deployment: {
    env: "Production", branch: "main", commit: "9f3c1a2",
    url: "edda.example.com", duration: "2m 31s",
    build: 100, upload: 100, warmup: 64,
  },
};

export const dashboardMockData = {
  server: { cpu: 42, memory: 68, disk: 23, net: 88, name: "prod-eu-1", statusState: "ok" },
};

export const servicesMockData = {
  services: [
    { name: "api",    status: "ok",    replicas: 3, cpu: 12 },
    { name: "web",    status: "ok",    replicas: 2, cpu: 8  },
    { name: "worker", status: "warn",  replicas: 1, cpu: 71 },
    { name: "mailer", status: "error", replicas: 0, cpu: 0  },
  ],
};

export function cliDeploy(): Node {
  return COL([
    ROW([T("◢ ", { color: "accent" }), T("Deployment Complete", { color: "fg", bold: true }), F(" "), ST("ok", "success")]),
    DIV("─"),
    SP(1),
    KV("Environment", "{{deployment.env}}"),
    KV("Branch",      "{{deployment.branch}} @ {{deployment.commit}}"),
    KV("Duration",    "{{deployment.duration}}"),
    KV("URL",         "{{deployment.url}}", "cyan"),
    SP(1),
    mk("progress", { valueBind: "deployment.build",  fillChar: "█", emptyChar: "░", color: "green",  label: "Build  ", labelColor: "dim" }),
    mk("progress", { valueBind: "deployment.upload", fillChar: "█", emptyChar: "░", color: "green",  label: "Upload ", labelColor: "dim" }),
    mk("progress", { valueBind: "deployment.warmup", fillChar: "█", emptyChar: "░", color: "accent", label: "Warmup ", labelColor: "dim" }),
    SP(1),
    mk("box", { title: "Services", border: "rounded", borderColor: "border", padX: 1, children: [
      COL([
        ROW([ST("ok",   "api"),    F(" "), T("3 replicas", { color: "dim" })]),
        ROW([ST("ok",   "web"),    F(" "), T("2 replicas", { color: "dim" })]),
        ROW([ST("warn", "worker"), F(" "), T("scaling…",   { color: "yellow" })]),
      ]),
    ]}),
    SP(1),
    ROW([T("Next ", { color: "dim" }), mk("kbd", { content: "edda logs --follow" })]),
  ]);
}

export function cliBanner(): Node {
  return COL([
    mk("ascii", { content: "EDDA", fillChar: "█", color: "accent", align: "left" }),
    SP(1),
    ROW([T("terminal interface designer", { color: "dim" })]),
    DIV("─"),
    SP(1),
    KV("Version", "v1.4.0"),
    KV("Status",  "ready", "green"),
    KV("Docs",    "edda.dev/start", "cyan"),
  ]);
}

export function cliInstaller(): Node {
  return COL([
    ROW([T("edda", { color: "accent", bold: true }), T(" installer "), T("v1.4.0", { color: "dim" })]),
    DIV("─"),
    SP(1),
    mk("list", { marker: "✔", markerColor: "green", items: [
      { text: "Resolved 142 packages", color: "fg" },
      { text: "Downloaded toolchain",  color: "fg" },
      { text: "Compiled native modules", color: "fg" },
    ]}),
    ROW([T("⟳ ", { color: "accent" }), T("Linking binaries")]),
    SP(1),
    mk("progress", { value: 78, color: "accent", label: "Progress ", labelColor: "dim" }),
    SP(1),
    KV("Install path", "/usr/local/bin/edda", "cyan"),
    KV("Disk used",    "184 MB"),
  ]);
}

export function cliReport(): Node {
  return COL([
    T("System Report", { color: "fg", bold: true }),
    DIV("─"),
    SP(1),
    mk("table", { headerColor: "accent", columns: [
      { label: "SERVICE" }, { label: "STATUS" },
      { label: "CPU", align: "right" }, { label: "MEM", align: "right" }, { label: "UPTIME", align: "right" },
    ], rows: [
      ["gateway",   "● running",  "12%",  "240MB", "14d"],
      ["scheduler", "● running",  "4%",   "96MB",  "14d"],
      ["indexer",   "▲ degraded", "71%",  "1.2GB", "2h" ],
      ["mailer",    "○ stopped",  "0%",   "0MB",   "—"  ],
    ]}),
    SP(1),
    ROW([T("Health", { color: "dim" }), F("."), T("3 / 4 nominal", { color: "yellow" })]),
  ]);
}

export function tuiDashboard(): Node {
  const nav = mk("box", { title: "nav", border: "single", borderColor: "border", padX: 1, paneWidth: 18, children: [
    COL([
      ROW([T("▸ ", { color: "accent" }), T("Overview", { color: "accent", bold: true })]),
      ROW([T("  "), T("Metrics", { color: "dim" })]),
      ROW([T("  "), T("Logs",    { color: "dim" })]),
      ROW([T("  "), T("Alerts",  { color: "dim" })]),
      ROW([T("  "), T("Nodes",   { color: "dim" })]),
      SP(1), DIV("─"),
      ROW([mk("status", { stateBind: "server.statusState", state: "ok", label: "healthy" })]),
    ]),
  ]});
  const metrics = mk("box", { title: "resources", border: "single", borderColor: "border", padX: 1, children: [
    COL([
      mk("progress", { valueBind: "server.cpu",    color: "green",  label: "CPU    ", labelColor: "dim" }),
      mk("progress", { valueBind: "server.memory", color: "accent", label: "Memory ", labelColor: "dim" }),
      mk("progress", { valueBind: "server.disk",   color: "cyan",   label: "Disk   ", labelColor: "dim" }),
      mk("progress", { valueBind: "server.net",    color: "yellow", label: "Net    ", labelColor: "dim" }),
    ]),
  ]});
  const logs = mk("box", { title: "logs", border: "single", borderColor: "border", padX: 1, children: [
    mk("list", { marker: "", items: [
      { text: "12:04:21  gateway   request 200 /v1/sync",   color: "dim"    },
      { text: "12:04:22  indexer   ▲ slow query 1.4s",      color: "yellow" },
      { text: "12:04:23  gateway   request 200 /v1/auth",   color: "dim"    },
      { text: "12:04:25  scheduler job#4192 complete",      color: "green"  },
    ]}),
  ]});
  return mk("box", { title: "edda · monitor", border: "rounded", borderColor: "accent", padX: 1, padY: 0, children: [
    COL([
      ROW([T("cluster: ", { color: "dim" }), T("{{server.name}}", { color: "fg", bold: true }), F(" "), mk("status", { state: "active", label: "live" }), T("   12:04:25", { color: "dim" })]),
      DIV("─"), SP(1),
      mk("split", { divider: true, dividerColor: "border", children: [nav, COL([metrics, SP(1), logs])] }),
      SP(1), DIV("─"),
      ROW([mk("kbd", { content: "↑↓" }), T(" navigate  ", { color: "dim" }), mk("kbd", { content: "⏎" }), T(" open  ", { color: "dim" }), mk("kbd", { content: "q" }), T(" quit", { color: "dim" }), F(" "), T("4 nodes · 0 alerts", { color: "green" })]),
    ]),
  ]});
}

export function tuiServices(): Node {
  const serviceRow = mk("row", { children: [
    mk("status", { stateBind: "item.status" }),
    T(" "),
    T("{{item.name}}", { color: "fg", bold: true }),
    F("."),
    T("×{{item.replicas}}  cpu:{{item.cpu}}%", { color: "dim" }),
  ]});
  return mk("box", { title: "edda · services", border: "rounded", borderColor: "accent", padX: 1, children: [
    COL([
      ROW([T("Service Health", { color: "fg", bold: true }), F(" "), T("{{services.length}} services", { color: "dim" })]),
      DIV("─"), SP(1),
      mk("collection", {
        source: "services",
        mockItems: servicesMockData.services,
        template: serviceRow,
        gap: 0,
      }),
      SP(1), DIV("─"),
      ROW([mk("kbd", { content: "r" }), T(" refresh  ", { color: "dim" }), mk("kbd", { content: "q" }), T(" quit", { color: "dim" })]),
    ]),
  ]});
}

export function tuiFiles(): Node {
  const tree = mk("box", { title: "files", border: "single", borderColor: "border", padX: 1, paneWidth: 24, children: [
    mk("list", { marker: "", items: [
      { text: "▾ src",             color: "accent" },
      { text: "  ▾ components",    color: "fg"     },
      { text: "    canvas.jsx",    color: "dim"    },
      { text: "    palette.jsx",   color: "dim"    },
      { text: "  engine.js",       color: "dim"    },
      { text: "  app.jsx",         color: "dim"    },
      { text: "▸ tests",           color: "fg"     },
      { text: "  README.md",       color: "dim"    },
    ]}),
  ]});
  const preview = mk("box", { title: "engine.js", border: "single", borderColor: "border", padX: 1, children: [
    mk("list", { marker: "", items: [
      { text: "1  export function render(node) {", color: "fg"  },
      { text: "2    const cols = node.width;",     color: "dim" },
      { text: "3    return layout(node, cols);",   color: "dim" },
      { text: "4  }",                              color: "fg"  },
    ]}),
  ]});
  return mk("box", { title: "edda · files", border: "rounded", borderColor: "accent", padX: 1, children: [
    COL([
      ROW([T("~/projects/edda", { color: "fg", bold: true }), F(" "), T("8 items", { color: "dim" })]),
      DIV("─"), SP(1),
      mk("split", { divider: true, children: [tree, preview] }),
      SP(1),
      ROW([mk("kbd", { content: "j/k" }), T(" move  ", { color: "dim" }), mk("kbd", { content: "⏎" }), T(" open  ", { color: "dim" }), mk("kbd", { content: "d" }), T(" delete", { color: "dim" })]),
    ]),
  ]});
}

export type SampleEntry = { label: string; build: () => Node; mockData: unknown };
export type SampleRegistry = { cli: Record<string, SampleEntry>; tui: Record<string, SampleEntry> };

export const SAMPLES: SampleRegistry = {
  cli: {
    deploy:    { label: "Deployment summary", build: cliDeploy,    mockData: deployMockData  },
    banner:    { label: "ASCII banner",       build: cliBanner,    mockData: null            },
    installer: { label: "Installer",          build: cliInstaller, mockData: null            },
    report:    { label: "Status report",      build: cliReport,    mockData: null            },
  },
  tui: {
    dashboard: { label: "Monitoring dashboard", build: tuiDashboard, mockData: dashboardMockData },
    services:  { label: "Services health",      build: tuiServices,  mockData: servicesMockData  },
    files:     { label: "File manager",         build: tuiFiles,     mockData: null              },
  },
};

export type AIPreset = {
  match: string[];
  mode: "cli" | "tui";
  build: () => Node;
  mockData: unknown;
  reply: string;
};

export const AI_PRESETS: AIPreset[] = [
  { match: ["deploy", "deployment", "release"],       mode: "cli", build: cliDeploy,    mockData: deployMockData,   reply: "Built a deployment summary with data-bound KV rows and progress bars. Edit values in the Data tab." },
  { match: ["dashboard", "monitor", "cpu", "memory"], mode: "tui", build: tuiDashboard, mockData: dashboardMockData, reply: "Generated a monitoring dashboard with live data bindings — drag the sliders in the Data tab to see it update." },
  { match: ["service", "health", "collection"],       mode: "tui", build: tuiServices,  mockData: servicesMockData,  reply: "Built a service-health TUI with a live collection — rows repeat from mock data, try changing a status." },
  { match: ["install", "installer", "setup"],         mode: "cli", build: cliInstaller, mockData: null,              reply: "Created an installer flow with a checklist and progress bar." },
  { match: ["report", "status", "table"],             mode: "cli", build: cliReport,    mockData: null,              reply: "Made a status report using a responsive table." },
  { match: ["file", "files", "explorer", "manager"],  mode: "tui", build: tuiFiles,     mockData: null,              reply: "Built a file-manager TUI with a tree pane and preview pane." },
];
