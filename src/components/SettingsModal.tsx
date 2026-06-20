import { useState } from "react";
import { loadAIConfig, saveAIConfig, AI_DEFAULTS } from "../ai/settings";
import { testOllamaConnection } from "../ai/client";
import type { AIConfig, AIProvider } from "../ai/settings";

interface Props {
  projectName: string;
  onRename: (name: string) => void;
  onClose: () => void;
}

export function SettingsModal({ projectName, onRename, onClose }: Props) {
  const [name, setName] = useState(projectName);
  const [ai, setAi] = useState<AIConfig>(() => loadAIConfig());
  const [testMsg, setTestMsg] = useState("");
  const [testing, setTesting] = useState(false);

  function patchAi(patch: Partial<AIConfig>) {
    setAi((c) => ({ ...c, ...patch }));
  }

  function save() {
    onRename(name.trim() || "Untitled");
    saveAIConfig(ai);
    onClose();
  }

  async function testOllama() {
    setTesting(true);
    setTestMsg("");
    try {
      const v = await testOllamaConnection(ai.ollamaUrl);
      setTestMsg(`✓ Connected — Ollama ${v}`);
    } catch (e) {
      setTestMsg(`✗ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTesting(false);
    }
  }

  const PROVIDERS: [AIProvider, string][] = [
    ["ollama",    "Ollama (local)"],
    ["anthropic", "Anthropic"],
    ["openai",    "OpenAI"],
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">Settings</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">

          {/* Project */}
          <label className="field-label">Project name</label>
          <div className="field-row">
            <input
              className="field-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") onClose(); }}
              autoFocus
              placeholder="Untitled"
            />
          </div>

          <div className="settings-divider" />

          {/* AI */}
          <label className="field-label">AI provider</label>
          <div className="field-row">
            <select
              className="field-input field-select"
              value={ai.provider}
              onChange={(e) => patchAi({ provider: e.target.value as AIProvider })}
            >
              {PROVIDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {ai.provider === "ollama" && (<>
            <label className="field-label">Ollama URL</label>
            <div className="field-row">
              <input
                className="field-input"
                value={ai.ollamaUrl}
                onChange={(e) => patchAi({ ollamaUrl: e.target.value })}
                placeholder={AI_DEFAULTS.ollamaUrl}
              />
              <button className="btn ghost" onClick={testOllama} disabled={testing}>
                {testing ? "…" : "Test"}
              </button>
            </div>
            {testMsg && (
              <p className={"field-help " + (testMsg.startsWith("✓") ? "ai-test-ok" : "ai-test-err")}>{testMsg}</p>
            )}
            <label className="field-label">Model</label>
            <div className="field-row">
              <input
                className="field-input"
                value={ai.ollamaModel}
                onChange={(e) => patchAi({ ollamaModel: e.target.value })}
                placeholder={AI_DEFAULTS.ollamaModel}
              />
            </div>
            <p className="field-help">Start with <code>ollama serve</code> and pull a model: <code>ollama pull llama3.2</code>. For CORS set <code>OLLAMA_ORIGINS=*</code>.</p>
          </>)}

          {ai.provider === "anthropic" && (<>
            <label className="field-label">API key</label>
            <div className="field-row">
              <input
                className="field-input"
                type="password"
                value={ai.anthropicKey}
                onChange={(e) => patchAi({ anthropicKey: e.target.value })}
                placeholder="sk-ant-…"
              />
            </div>
            <label className="field-label">Model</label>
            <div className="field-row">
              <input
                className="field-input"
                value={ai.anthropicModel}
                onChange={(e) => patchAi({ anthropicModel: e.target.value })}
                placeholder={AI_DEFAULTS.anthropicModel}
              />
            </div>
          </>)}

          {ai.provider === "openai" && (<>
            <label className="field-label">API key</label>
            <div className="field-row">
              <input
                className="field-input"
                type="password"
                value={ai.openaiKey}
                onChange={(e) => patchAi({ openaiKey: e.target.value })}
                placeholder="sk-…"
              />
            </div>
            <label className="field-label">Model</label>
            <div className="field-row">
              <input
                className="field-input"
                value={ai.openaiModel}
                onChange={(e) => patchAi({ openaiModel: e.target.value })}
                placeholder={AI_DEFAULTS.openaiModel}
              />
            </div>
          </>)}

          <div className="modal-foot">
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" onClick={save}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
