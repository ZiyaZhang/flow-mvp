import type { FlowEdge, FlowNode, Session } from "./types.js";

const NODE_SHAPES: Record<FlowNode["type"], [string, string]> = {
  start: ["([", "])"],
  step: ["[", "]"],
  decision: ["{", "}"],
  end: ["([", "])"],
};

function sortNodes(nodes: FlowNode[]): FlowNode[] {
  return [...nodes].sort((left, right) => left.order - right.order);
}

function ensureUniqueEdges(session: Pick<Session, "nodes" | "edges">): FlowEdge[] {
  const existing = new Map<string, FlowEdge>();

  for (const edge of session.edges) {
    existing.set(`${edge.from}:${edge.to}:${edge.type}`, edge);
  }

  for (const node of session.nodes) {
    if (!node.parentId) {
      continue;
    }

    const key = `${node.parentId}:${node.id}:parent_child`;
    if (!existing.has(key)) {
      existing.set(key, {
        id: `edge-${node.parentId}-${node.id}`,
        from: node.parentId,
        to: node.id,
        type: "parent_child",
      });
    }
  }

  return [...existing.values()];
}

function escapeMermaidText(value: string): string {
  return value.replace(/"/g, '\\"').replace(/\n/g, " ");
}

function toMermaidNode(node: FlowNode): string {
  const [open, close] = NODE_SHAPES[node.type];
  return `${node.id}${open}"${escapeMermaidText(node.title)}"${close}`;
}

export function buildMarkdown(session: Pick<Session, "title" | "brief" | "nodes" | "edges">): string {
  const nodes = sortNodes(session.nodes);
  const edges = ensureUniqueEdges(session);

  const lines = [
    `# ${session.title}`,
    "",
    "## Brief",
    session.brief,
    "",
    "## Nodes",
  ];

  for (const node of nodes) {
    lines.push(`### ${node.order + 1}. ${node.title}`);
    lines.push(`- Type: ${node.type}`);
    if (node.parentId) {
      lines.push(`- Parent: ${node.parentId}`);
    }
    if (node.description.trim()) {
      lines.push(`- Description: ${node.description.trim()}`);
    }
    lines.push("");
  }

  lines.push("## Edges");
  if (edges.length === 0) {
    lines.push("- No explicit edges defined.");
  } else {
    for (const edge of edges) {
      lines.push(
        `- ${edge.from} -> ${edge.to} (${edge.type}${edge.label ? `, ${edge.label}` : ""})`,
      );
    }
  }

  return lines.join("\n").trim();
}

export function buildMermaid(session: Pick<Session, "title" | "nodes" | "edges">): string {
  const nodes = sortNodes(session.nodes);
  const edges = ensureUniqueEdges(session);

  const lines = ["flowchart TD"];

  for (const node of nodes) {
    lines.push(`  ${toMermaidNode(node)}`);
  }

  if (edges.length === 0 && nodes.length > 1) {
    for (let index = 0; index < nodes.length - 1; index += 1) {
      lines.push(`  ${nodes[index]!.id} --> ${nodes[index + 1]!.id}`);
    }
  } else {
    for (const edge of edges) {
      const connector = edge.type === "parent_child" ? "-->" : "==>";
      const label = edge.label ? `|${escapeMermaidText(edge.label)}|` : "";
      lines.push(`  ${edge.from} ${connector}${label} ${edge.to}`);
    }
  }

  return lines.join("\n");
}

export function buildJson(session: Pick<Session, "sessionId" | "status" | "title" | "brief" | "nodes" | "edges">): string {
  return JSON.stringify(
    {
      sessionId: session.sessionId,
      status: session.status,
      title: session.title,
      brief: session.brief,
      nodes: sortNodes(session.nodes),
      edges: ensureUniqueEdges(session),
    },
    null,
    2,
  );
}

export function buildSessionExports(session: Pick<Session, "sessionId" | "status" | "title" | "brief" | "nodes" | "edges">) {
  return {
    markdown: buildMarkdown(session),
    mermaid: buildMermaid(session),
    json: buildJson(session),
  };
}

export function buildApplyResultText(session: Session, format: "markdown" | "mermaid" | "json"): string {
  if (format === "json") {
    return [
      "Use the following JSON as structured flow/session input.",
      "",
      session.exports.json,
    ].join("\n");
  }

  if (format === "mermaid") {
    return ["Use the following Mermaid flowchart.", "", "```mermaid", session.exports.mermaid, "```"].join(
      "\n",
    );
  }

  return ["Use the following Markdown requirement breakdown.", "", session.exports.markdown].join(
    "\n",
  );
}
