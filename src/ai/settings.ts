export type AIProvider = "ollama" | "anthropic" | "openai";

export interface AIConfig {
  provider: AIProvider;
  ollamaUrl: string;
  ollamaModel: string;
  anthropicKey: string;
  anthropicModel: string;
  openaiKey: string;
  openaiModel: string;
}

export const AI_DEFAULTS: AIConfig = {
  provider: "ollama",
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "llama3.2",
  anthropicKey: "",
  anthropicModel: "claude-haiku-4-5-20251001",
  openaiKey: "",
  openaiModel: "gpt-4o-mini",
};

const STORAGE_KEY = "edda_ai_config_v1";

export function loadAIConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...AI_DEFAULTS, ...(JSON.parse(raw) as Partial<AIConfig>) };
  } catch (_) {}
  return { ...AI_DEFAULTS };
}

export function saveAIConfig(cfg: AIConfig): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch (_) {}
}
