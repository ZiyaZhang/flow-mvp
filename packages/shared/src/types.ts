export type SessionStatus = "draft" | "in_progress" | "completed";

export type FlowNodeType = "start" | "step" | "decision" | "end";

export type FlowEdgeType = "sequence" | "parent_child";

export type FlowNode = {
  id: string;
  title: string;
  description: string;
  type: FlowNodeType;
  order: number;
  parentId?: string | null;
};

export type FlowEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
  type: FlowEdgeType;
};

export type SessionExports = {
  markdown: string;
  mermaid: string;
  json: string;
};

export type Session = {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  status: SessionStatus;
  title: string;
  brief: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  exports: SessionExports;
};

export type StartSessionInput = {
  title: string;
  brief: string;
  initialNodes?: Array<{
    title: string;
    description?: string;
    type?: FlowNodeType;
  }>;
};

export type StartSessionResult = {
  sessionId: string;
  localUrl: string;
  status: SessionStatus;
  summary: string;
  initialData: Pick<Session, "title" | "brief" | "nodes" | "edges">;
};

export type SessionStateResult = {
  sessionId: string;
  status: SessionStatus;
  updatedAt: string;
  completed: boolean;
  title: string;
  brief: string;
  nodeCount: number;
  edgeCount: number;
  localUrl: string;
};

export type SessionResult = {
  sessionId: string;
  status: SessionStatus;
  updatedAt: string;
  title: string;
  brief: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  markdown: string;
  mermaid: string;
  json: string;
};

export type ApplySessionResultInput = {
  sessionId: string;
  format: "markdown" | "mermaid" | "json";
};

export type ApplySessionResultOutput = {
  sessionId: string;
  format: "markdown" | "mermaid" | "json";
  content: string;
};
