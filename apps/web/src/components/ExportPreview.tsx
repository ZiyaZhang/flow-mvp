import { useState } from "react";

import type { Session, SessionExports } from "../../../../packages/shared/src/index.js";

type SaveState = {
  mode: "idle" | "saving" | "saved" | "error";
  message: string;
};

type ExportPreviewProps = {
  session: Session;
  preview: SessionExports;
  saveState: SaveState;
  onSave: () => Promise<void>;
  onComplete: () => Promise<void>;
};

export function ExportPreview({
  session,
  preview,
  saveState,
  onSave,
  onComplete,
}: ExportPreviewProps) {
  const [tab, setTab] = useState<keyof SessionExports>("markdown");

  return (
    <aside className="panel panel-preview">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Exports</p>
          <h2>Live Preview</h2>
        </div>
        <span className={`status-badge status-${session.status}`}>{session.status}</span>
      </div>

      <div className="action-row">
        <button className="ghost-button" onClick={() => void onSave()} type="button">
          Save Draft
        </button>
        <button className="primary-button" onClick={() => void onComplete()} type="button">
          Complete & Save
        </button>
      </div>

      <p className={`save-hint save-${saveState.mode}`}>{saveState.message}</p>
      <p className="muted">Session: {session.sessionId}</p>
      <p className="muted">Updated: {new Date(session.updatedAt).toLocaleString()}</p>

      <div className="tab-row">
        {(["markdown", "mermaid", "json"] as const).map((nextTab) => (
          <button
            key={nextTab}
            className={`tab ${tab === nextTab ? "active" : ""}`}
            onClick={() => setTab(nextTab)}
            type="button"
          >
            {nextTab}
          </button>
        ))}
      </div>

      <pre className="preview-block">
        <code>{preview[tab]}</code>
      </pre>
    </aside>
  );
}
