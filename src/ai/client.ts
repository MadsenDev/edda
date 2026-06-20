import type { Node } from "../engine/model";
import { uid } from "../engine/model";
import { loadAIConfig } from "./settings";
import { SYSTEM_PROMPT } from "./schema";

export interface AIResult {
  mode: "cli" | "tui";
  layout: Node;
  mockData: unknown;
  reply: string;
}

function ensureIds(node: unknown): unknown {
  if (!node || typeof node !== "object" || Array.isArray(node)) return node;
  const n = node as Record<string, unknown>;
  if (!n.id || typeof n.id !== "string") {
    n.id = uid(typeof n.type === "string" ? n.type : "n");
  }
  if (Array.isArray(n.children)) {
    n.children = (n.children as unknown[]).map(ensureIds);
  }
  if (n.template && typeof n.template === "object") {
    n.template = ensureIds(n.template);
  }
  return n;
}

function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

export async function generateLayout(prompt: string): Promise<AIResult> {
  const cfg = loadAIConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    let rawText: string;

    if (cfg.provider === "ollama") {
      const res = await fetch(`${cfg.ollamaUrl.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: cfg.ollamaModel,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          format: "json",
          stream: false,
          options: { temperature: 0.3 },
        }),
      });
      if (!res.ok) {
        const err = await res.text().catch(() => res.statusText);
        if (res.status === 0 || res.status === 404) {
          throw new Error(`Cannot reach Ollama at ${cfg.ollamaUrl}. Is it running? Try: ollama serve`);
        }
        throw new Error(`Ollama ${res.status}: ${err.slice(0, 200)}`);
      }
      const data = await res.json() as { message?: { content?: string }; error?: string };
      if (data.error) throw new Error(`Ollama: ${data.error}`);
      rawText = data.message?.content ?? "";

    } else if (cfg.provider === "anthropic") {
      if (!cfg.anthropicKey) throw new Error("Anthropic API key not set — open Settings → AI to configure.");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": cfg.anthropicKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: cfg.anthropicModel,
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: res.statusText } })) as { error?: { message?: string } };
        throw new Error(`Anthropic ${res.status}: ${err.error?.message ?? res.statusText}`);
      }
      const data = await res.json() as { content?: Array<{ type: string; text?: string }> };
      rawText = data.content?.find((b) => b.type === "text")?.text ?? "";

    } else {
      // OpenAI
      if (!cfg.openaiKey) throw new Error("OpenAI API key not set — open Settings → AI to configure.");
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${cfg.openaiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: cfg.openaiModel,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 4096,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: res.statusText } })) as { error?: { message?: string } };
        throw new Error(`OpenAI ${res.status}: ${err.error?.message ?? res.statusText}`);
      }
      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
      rawText = data.choices?.[0]?.message?.content ?? "";
    }

    const jsonStr = extractJSON(rawText);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    } catch (e) {
      throw new Error(`Couldn't parse AI response as JSON: ${String(e)}\n\nGot: ${rawText.slice(0, 300)}`);
    }

    const mode = (parsed.mode === "tui" ? "tui" : "cli") as "cli" | "tui";
    const layout = ensureIds(parsed.layout) as Node;
    if (!layout || typeof layout !== "object" || !("type" in layout)) {
      throw new Error("AI response is missing a valid layout node.");
    }

    return {
      mode,
      layout,
      mockData: parsed.mockData ?? null,
      reply: typeof parsed.reply === "string" ? parsed.reply : "Layout generated.",
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("AI request timed out after 2 minutes.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function testOllamaConnection(url: string): Promise<string> {
  const res = await fetch(`${url.replace(/\/$/, "")}/api/version`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json() as { version?: string };
  return data.version ?? "unknown";
}
