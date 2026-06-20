export function resolveBinding(path: string, data: unknown): unknown {
  if (!data || !path) return undefined;
  const parts = String(path).trim().split(".");
  let val: unknown = data;
  for (const p of parts) {
    if (val == null || typeof val !== "object") return undefined;
    val = (val as Record<string, unknown>)[p];
  }
  return val !== undefined ? val : undefined;
}

export function resolveBindings(content: string, data: unknown): string {
  const str = content != null ? String(content) : "";
  if (!data || str.indexOf("{{") < 0) return str;
  return str.replace(/\{\{([^}]+)\}\}/g, (_match, path: string) => {
    const val = resolveBinding(path.trim(), data);
    return val != null ? String(val) : _match;
  });
}
