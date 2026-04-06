import type { Session } from "../../../../packages/shared/src/index.js";

type SidebarProps = {
  session: Session;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onTitleChange: (value: string) => void;
  onBriefChange: (value: string) => void;
  onAddNode: () => void;
};

export function Sidebar({
  session,
  selectedNodeId,
  onSelectNode,
  onTitleChange,
  onBriefChange,
  onAddNode,
}: SidebarProps) {
  return (
    <aside className="panel panel-sidebar">
      <div className="panel-heading">
        <p className="eyebrow">Requirement</p>
        <h2>Flow Brief</h2>
      </div>

      <label className="field">
        <span>Title</span>
        <input value={session.title} onChange={(event) => onTitleChange(event.target.value)} />
      </label>

      <label className="field">
        <span>Brief</span>
        <textarea
          rows={6}
          value={session.brief}
          onChange={(event) => onBriefChange(event.target.value)}
        />
      </label>

      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">Nodes</p>
          <h3>{session.nodes.length} items</h3>
        </div>
        <button className="ghost-button" onClick={onAddNode} type="button">
          Add Node
        </button>
      </div>

      <div className="node-summary-list">
        {session.nodes.map((node) => (
          <button
            key={node.id}
            className={`node-summary ${selectedNodeId === node.id ? "active" : ""}`}
            onClick={() => onSelectNode(node.id)}
            type="button"
          >
            <span className={`pill pill-${node.type}`}>{node.type}</span>
            <strong>{node.title || "Untitled"}</strong>
            <small>{node.description || "No description yet"}</small>
          </button>
        ))}
      </div>
    </aside>
  );
}
