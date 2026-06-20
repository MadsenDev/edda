import { useState } from "react";

interface Props {
  projectName: string;
  onRename: (name: string) => void;
  onClose: () => void;
}

export function SettingsModal({ projectName, onRename, onClose }: Props) {
  const [name, setName] = useState(projectName);

  function save() {
    onRename(name.trim() || "Untitled");
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">Project settings</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label className="field-label">Project name</label>
          <div className="field-row">
            <input
              className="field-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") onClose();
              }}
              autoFocus
              placeholder="Untitled"
            />
            <button className="btn primary" onClick={save}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
