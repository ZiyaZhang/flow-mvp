import { useEffect, useState } from "react";

import { buildSessionExports, type FlowEdge, type FlowNode, type Session } from "../../../packages/shared/src/index.js";
import { ExportPreview } from "./components/ExportPreview.js";
import { Sidebar } from "./components/Sidebar.js";
import { StructureEditor } from "./components/StructureEditor.js";
import { completeSession, fetchSession, saveSession } from "./lib/api.js";
import { createNode, getSessionIdFromLocation, reorderNodeList } from "./lib/session.js";

type SaveState = {
  mode: "idle" | "saving" | "saved" | "error";
  message: string;
};

function cloneSession(session: Session): Session {
  return {
    ...session,
    nodes: session.nodes.map((node) => ({ ...node })),
    edges: session.edges.map((edge) => ({ ...edge })),
    exports: { ...session.exports },
  };
}

export default function App() {
  const sessionId = getSessionIdFromLocation(window.location.pathname);
  const [session, setSession] = useState<Session | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({
    mode: "idle",
    message: "Changes are local until you save.",
  });

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      setError("Missing session id in URL. Expected /app/:sessionId");
      return;
    }

    const currentSessionId: string = sessionId;

    let cancelled = false;

    async function load() {
      try {
        const nextSession = await fetchSession(currentSessionId);
        if (cancelled) {
          return;
        }

        setSession(cloneSession(nextSession));
        setSelectedNodeId(nextSession.nodes[0]?.id ?? null);
        setError(null);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load session");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) {
    return <main className="shell loading-shell">Loading local session...</main>;
  }

  if (error || !sessionId || !session) {
    return (
      <main className="shell loading-shell">
        <div className="error-card">
          <p className="eyebrow">Flow MVP</p>
          <h1>Unable to load session</h1>
          <p>{error ?? "Session data is unavailable."}</p>
        </div>
      </main>
    );
  }

  const activeSession = session;

  const preview = buildSessionExports({
    sessionId: activeSession.sessionId,
    status: activeSession.status,
    title: activeSession.title,
    brief: activeSession.brief,
    nodes: activeSession.nodes,
    edges: activeSession.edges,
  });

  function updateSession(mutator: (current: Session) => Session) {
    setSession((current) => {
      if (!current) {
        return current;
      }

      const next = mutator(cloneSession(current));
      return {
        ...next,
        exports: buildSessionExports({
          sessionId: next.sessionId,
          status: next.status,
          title: next.title,
          brief: next.brief,
          nodes: next.nodes,
          edges: next.edges,
        }),
      };
    });
    setSaveState({
      mode: "idle",
      message: "Unsaved local edits.",
    });
  }

  function handleAddNode() {
    const nextNode = createNode(activeSession.nodes.length);
    updateSession((current) => {
      current.nodes.push(nextNode);
      return current;
    });
    setSelectedNodeId(nextNode.id);
  }

  function handleNodeChange(nodeId: string, patch: Partial<FlowNode>) {
    updateSession((current) => {
      current.nodes = current.nodes.map((node) => (node.id === nodeId ? { ...node, ...patch } : node));
      return current;
    });
  }

  function handleDeleteNode(nodeId: string) {
    updateSession((current) => {
      current.nodes = current.nodes
        .filter((node) => node.id !== nodeId)
        .map((node, index) => ({
          ...node,
          order: index,
          parentId: node.parentId === nodeId ? null : node.parentId,
        }));
      current.edges = current.edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId);
      return current;
    });

    if (selectedNodeId === nodeId) {
      setSelectedNodeId(activeSession.nodes.find((node) => node.id !== nodeId)?.id ?? null);
    }
  }

  function handleMoveNode(nodeId: string, direction: "up" | "down") {
    updateSession((current) => {
      const index = current.nodes.findIndex((node) => node.id === nodeId);
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (index < 0 || targetIndex < 0 || targetIndex >= current.nodes.length) {
        return current;
      }

      const reordered = [...current.nodes];
      const [moved] = reordered.splice(index, 1);
      reordered.splice(targetIndex, 0, moved!);
      current.nodes = reordered.map((node, nextIndex) => ({ ...node, order: nextIndex }));
      return current;
    });
  }

  function handleReorderNodes(sourceId: string, targetId: string) {
    updateSession((current) => {
      current.nodes = reorderNodeList(current.nodes, sourceId, targetId);
      return current;
    });
  }

  function handleAddEdge(input: Omit<FlowEdge, "id">) {
    updateSession((current) => {
      current.edges.push({
        ...input,
        id: `edge_${crypto.randomUUID().slice(0, 8)}`,
      });
      return current;
    });
  }

  function handleDeleteEdge(edgeId: string) {
    updateSession((current) => {
      current.edges = current.edges.filter((edge) => edge.id !== edgeId);
      return current;
    });
  }

  async function persist(mode: "draft" | "completed") {
    setSaveState({
      mode: "saving",
      message: mode === "completed" ? "Saving completed flow..." : "Saving draft...",
    });

    try {
      const payload = {
        title: activeSession.title,
        brief: activeSession.brief,
        nodes: activeSession.nodes,
        edges: activeSession.edges,
        status: mode === "completed" ? "completed" : "in_progress",
      } as const;
      const saved =
        mode === "completed"
          ? await completeSession(activeSession.sessionId, payload)
          : await saveSession(activeSession.sessionId, payload);

      setSession(cloneSession(saved));
      setSaveState({
        mode: "saved",
        message:
          mode === "completed"
            ? "Completed. Return to CodeBuddy and run /flow-mvp:resume."
            : "Draft saved to local session store.",
      });
    } catch (persistError) {
      setSaveState({
        mode: "error",
        message: persistError instanceof Error ? persistError.message : "Failed to save session.",
      });
    }
  }

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">CodeBuddy + MCP + localhost</p>
          <h1>Flow MVP Sidecar Editor</h1>
        </div>
        <p className="hero-copy">
          This page is the browser half of the MVP. Edit the structure here, save it locally, then return to
          CodeBuddy to resume the session.
        </p>
      </header>

      <section className="workspace">
        <Sidebar
          session={activeSession}
          selectedNodeId={selectedNodeId}
          onAddNode={handleAddNode}
          onBriefChange={(value) => updateSession((current) => ({ ...current, brief: value }))}
          onSelectNode={setSelectedNodeId}
          onTitleChange={(value) => updateSession((current) => ({ ...current, title: value }))}
        />

        <StructureEditor
          session={activeSession}
          selectedNodeId={selectedNodeId}
          onAddEdge={handleAddEdge}
          onDeleteEdge={handleDeleteEdge}
          onDeleteNode={handleDeleteNode}
          onMoveNode={handleMoveNode}
          onNodeChange={handleNodeChange}
          onReorderNodes={handleReorderNodes}
          onSelectNode={setSelectedNodeId}
        />

        <ExportPreview
          session={activeSession}
          preview={preview}
          saveState={saveState}
          onComplete={() => persist("completed")}
          onSave={() => persist("draft")}
        />
      </section>
    </main>
  );
}
