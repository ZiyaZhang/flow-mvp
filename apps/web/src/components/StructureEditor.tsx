import { useState } from "react";

import type { FlowEdge, FlowEdgeType, FlowNode, Session } from "../../../../packages/shared/src/index.js";

type StructureEditorProps = {
  session: Session;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onNodeChange: (nodeId: string, patch: Partial<FlowNode>) => void;
  onDeleteNode: (nodeId: string) => void;
  onMoveNode: (nodeId: string, direction: "up" | "down") => void;
  onReorderNodes: (sourceId: string, targetId: string) => void;
  onAddEdge: (input: Omit<FlowEdge, "id">) => void;
  onDeleteEdge: (edgeId: string) => void;
};

export function StructureEditor({
  session,
  selectedNodeId,
  onSelectNode,
  onNodeChange,
  onDeleteNode,
  onMoveNode,
  onReorderNodes,
  onAddEdge,
  onDeleteEdge,
}: StructureEditorProps) {
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [edgeFrom, setEdgeFrom] = useState("");
  const [edgeTo, setEdgeTo] = useState("");
  const [edgeType, setEdgeType] = useState<FlowEdgeType>("sequence");
  const [edgeLabel, setEdgeLabel] = useState("");

  function submitEdge() {
    if (!edgeFrom || !edgeTo || edgeFrom === edgeTo) {
      return;
    }

    onAddEdge({
      from: edgeFrom,
      to: edgeTo,
      type: edgeType,
      label: edgeLabel.trim() || undefined,
    });
    setEdgeLabel("");
  }

  return (
    <section className="panel panel-center">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Structure</p>
          <h2>Sortable Flow Editor</h2>
        </div>
        <p className="muted">Drag cards to reorder. Parent links and explicit edges are both supported.</p>
      </div>

      <div className="card-list">
        {session.nodes.map((node, index) => (
          <article
            key={node.id}
            className={`flow-card ${selectedNodeId === node.id ? "selected" : ""}`}
            draggable
            onClick={() => onSelectNode(node.id)}
            onDragStart={() => setDragNodeId(node.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragNodeId) {
                onReorderNodes(dragNodeId, node.id);
              }
              setDragNodeId(null);
            }}
          >
            <div className="flow-card-toolbar">
              <span className="index-chip">{index + 1}</span>
              <div className="toolbar-actions">
                <button type="button" onClick={() => onMoveNode(node.id, "up")}>
                  Up
                </button>
                <button type="button" onClick={() => onMoveNode(node.id, "down")}>
                  Down
                </button>
                <button className="danger" type="button" onClick={() => onDeleteNode(node.id)}>
                  Delete
                </button>
              </div>
            </div>

            <div className="grid-two">
              <label className="field">
                <span>Title</span>
                <input
                  value={node.title}
                  onChange={(event) => onNodeChange(node.id, { title: event.target.value })}
                />
              </label>

              <label className="field">
                <span>Type</span>
                <select
                  value={node.type}
                  onChange={(event) =>
                    onNodeChange(node.id, {
                      type: event.target.value as FlowNode["type"],
                    })
                  }
                >
                  <option value="start">start</option>
                  <option value="step">step</option>
                  <option value="decision">decision</option>
                  <option value="end">end</option>
                </select>
              </label>
            </div>

            <label className="field">
              <span>Description</span>
              <textarea
                rows={4}
                value={node.description}
                onChange={(event) => onNodeChange(node.id, { description: event.target.value })}
              />
            </label>

            <label className="field">
              <span>Parent Node</span>
              <select
                value={node.parentId ?? ""}
                onChange={(event) =>
                  onNodeChange(node.id, {
                    parentId: event.target.value || null,
                  })
                }
              >
                <option value="">No parent</option>
                {session.nodes
                  .filter((candidate) => candidate.id !== node.id)
                  .map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.title}
                    </option>
                  ))}
              </select>
            </label>
          </article>
        ))}
      </div>

      <div className="edge-panel">
        <div className="panel-heading compact">
          <div>
            <p className="eyebrow">Links</p>
            <h3>Explicit Edges</h3>
          </div>
        </div>

        <div className="edge-form">
          <select value={edgeFrom} onChange={(event) => setEdgeFrom(event.target.value)}>
            <option value="">From node</option>
            {session.nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.title}
              </option>
            ))}
          </select>

          <select value={edgeType} onChange={(event) => setEdgeType(event.target.value as FlowEdgeType)}>
            <option value="sequence">sequence</option>
            <option value="parent_child">parent_child</option>
          </select>

          <select value={edgeTo} onChange={(event) => setEdgeTo(event.target.value)}>
            <option value="">To node</option>
            {session.nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.title}
              </option>
            ))}
          </select>

          <input
            placeholder="Optional label"
            value={edgeLabel}
            onChange={(event) => setEdgeLabel(event.target.value)}
          />

          <button className="ghost-button" onClick={submitEdge} type="button">
            Add Edge
          </button>
        </div>

        <div className="edge-list">
          {session.edges.length === 0 ? (
            <p className="muted">No explicit edges yet.</p>
          ) : (
            session.edges.map((edge) => (
              <div className="edge-row" key={edge.id}>
                <span>
                  {edge.from} → {edge.to} <em>({edge.type})</em>
                  {edge.label ? ` · ${edge.label}` : ""}
                </span>
                <button className="danger" onClick={() => onDeleteEdge(edge.id)} type="button">
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
