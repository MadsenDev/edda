import { useState } from "react";

interface Props {
  onGenerate: (prompt: string) => void;
  busy: boolean;
  reply?: string;
  error?: string;
}

const PRESETS = ["deployment summary", "monitoring dashboard", "services health"];

export function AIBar({ onGenerate, busy, reply, error }: Props) {
  const [val, setVal] = useState("");
  const submit = () => { if (val.trim()) onGenerate(val.trim()); };
  return (
    <div className="ai-bar">
      <div className="ai-main-row">
        <span className="ai-spark">{busy ? "◌" : "✦"}</span>
        <input
          className="ai-input"
          value={val}
          disabled={busy}
          placeholder={busy ? "Generating layout…" : "Describe a layout — \"a deployment monitor with live metrics\""}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        />
        <div className="ai-chips">
          {PRESETS.map((p) => (
            <button key={p} className="ai-chip" disabled={busy} onClick={() => { setVal(p); onGenerate(p); }}>{p}</button>
          ))}
        </div>
        <button className="ai-go" disabled={busy} onClick={submit}>{busy ? "…" : "Generate"}</button>
      </div>
      {reply && !busy && (
        <div className="ai-reply">✦ {reply}</div>
      )}
      {error && !busy && (
        <div className="ai-error">⚠ {error}</div>
      )}
    </div>
  );
}
