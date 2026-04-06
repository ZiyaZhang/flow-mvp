import { z } from "zod";

import {
  buildApplyResultText,
  buildSessionExports,
  flowEdgeSchema,
  flowNodeSchema,
  sessionSchema,
  startSessionInputSchema,
  type ApplySessionResultOutput,
  type FlowEdge,
  type FlowNode,
  type Session,
  type SessionResult,
  type SessionStateResult,
  type StartSessionInput,
  type StartSessionResult,
} from "../../../../packages/shared/src/index.js";
import type { AppConfig } from "../config.js";
import { buildLocalUrl } from "../config.js";
import { SessionStore } from "./store.js";

const updateSessionFromWebSchema = z.object({
  title: z.string().min(1),
  brief: z.string().min(1),
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
  status: z.enum(["draft", "in_progress", "completed"]).optional(),
});

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeNodes(nodes: FlowNode[]): FlowNode[] {
  return [...nodes]
    .sort((left, right) => left.order - right.order)
    .map((node, index) => ({
      ...node,
      title: node.title.trim() || `Node ${index + 1}`,
      description: node.description.trim(),
      order: index,
      parentId: node.parentId ?? null,
    }));
}

function normalizeEdges(nodes: FlowNode[], edges: FlowEdge[]): FlowEdge[] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const unique = new Map<string, FlowEdge>();

  for (const edge of edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to) || edge.from === edge.to) {
      continue;
    }

    const key = `${edge.from}:${edge.to}:${edge.type}:${edge.label ?? ""}`;
    if (!unique.has(key)) {
      unique.set(key, {
        ...edge,
        label: edge.label?.trim() || undefined,
      });
    }
  }

  return [...unique.values()];
}

function createDefaultNodes(input: StartSessionInput): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const fallbackNodes = input.initialNodes?.length
    ? input.initialNodes
    : [
        {
          title: "开始",
          description: `围绕“${input.title}”明确目标与输入边界。`,
          type: "start" as const,
        },
        {
          title: "核心步骤",
          description: input.brief,
          type: "step" as const,
        },
        {
          title: "结束",
          description: "确认产出、下一步动作或交付结果。",
          type: "end" as const,
        },
      ];

  const nodes = fallbackNodes.map((node, index) => ({
    id: createId("node"),
    title: node.title,
    description: node.description ?? "",
    type: node.type ?? "step",
    order: index,
    parentId: null,
  }));

  const edges = nodes.slice(0, -1).map((node, index) => ({
    id: createId("edge"),
    from: node.id,
    to: nodes[index + 1]!.id,
    type: "sequence" as const,
  }));

  return { nodes, edges };
}

export class FlowSessionService {
  constructor(
    private readonly store: SessionStore,
    private readonly config: AppConfig,
  ) {}

  async startSession(input: StartSessionInput): Promise<StartSessionResult> {
    const parsed = startSessionInputSchema.parse(input);
    const sessionId = createId("session");
    const now = new Date().toISOString();
    const { nodes, edges } = createDefaultNodes(parsed);

    const baseSession: Session = {
      sessionId,
      createdAt: now,
      updatedAt: now,
      status: "draft",
      title: parsed.title,
      brief: parsed.brief,
      nodes,
      edges,
      exports: {
        markdown: "",
        mermaid: "",
        json: "",
      },
    };

    const session = await this.persist(baseSession);

    return {
      sessionId: session.sessionId,
      localUrl: this.getLocalUrl(session.sessionId),
      status: session.status,
      summary: `Session created. Open ${this.getLocalUrl(
        session.sessionId,
      )} in your browser, edit the flow, then return to CodeBuddy and run /flow-mvp:resume.`,
      initialData: {
        title: session.title,
        brief: session.brief,
        nodes: session.nodes,
        edges: session.edges,
      },
    };
  }

  async getSessionState(sessionId: string): Promise<SessionStateResult> {
    const session = await this.requireSession(sessionId);
    return {
      sessionId: session.sessionId,
      status: session.status,
      updatedAt: session.updatedAt,
      completed: session.status === "completed",
      title: session.title,
      brief: session.brief,
      nodeCount: session.nodes.length,
      edgeCount: session.edges.length,
      localUrl: this.getLocalUrl(session.sessionId),
    };
  }

  async getSessionResult(sessionId: string): Promise<SessionResult> {
    const session = await this.requireSession(sessionId);
    return {
      sessionId: session.sessionId,
      status: session.status,
      updatedAt: session.updatedAt,
      title: session.title,
      brief: session.brief,
      nodes: session.nodes,
      edges: session.edges,
      markdown: session.exports.markdown,
      mermaid: session.exports.mermaid,
      json: session.exports.json,
    };
  }

  async applySessionResult(
    sessionId: string,
    format: "markdown" | "mermaid" | "json",
  ): Promise<ApplySessionResultOutput> {
    const session = await this.requireSession(sessionId);
    return {
      sessionId,
      format,
      content: buildApplyResultText(session, format),
    };
  }

  async getLatestSession(): Promise<Session | null> {
    return this.store.getLatest();
  }

  async getSession(sessionId: string): Promise<Session> {
    return this.requireSession(sessionId);
  }

  async saveDraft(
    sessionId: string,
    input: z.infer<typeof updateSessionFromWebSchema>,
  ): Promise<Session> {
    const parsed = updateSessionFromWebSchema.parse(input);
    const current = await this.requireSession(sessionId);

    return this.persist({
      ...current,
      title: parsed.title,
      brief: parsed.brief,
      status: parsed.status ?? "in_progress",
      nodes: normalizeNodes(parsed.nodes),
      edges: normalizeEdges(parsed.nodes, parsed.edges),
    });
  }

  async completeSession(
    sessionId: string,
    input: z.infer<typeof updateSessionFromWebSchema>,
  ): Promise<Session> {
    return this.saveDraft(sessionId, {
      ...input,
      status: "completed",
    });
  }

  getLocalUrl(sessionId: string): string {
    return buildLocalUrl(this.config, sessionId);
  }

  getWebUpdateSchema() {
    return updateSessionFromWebSchema;
  }

  private async persist(session: Session): Promise<Session> {
    const normalizedNodes = normalizeNodes(session.nodes);
    const normalizedEdges = normalizeEdges(normalizedNodes, session.edges);
    const now = new Date().toISOString();

    const nextSession = sessionSchema.parse({
      ...session,
      updatedAt: now,
      nodes: normalizedNodes,
      edges: normalizedEdges,
      exports: buildSessionExports({
        sessionId: session.sessionId,
        status: session.status,
        title: session.title,
        brief: session.brief,
        nodes: normalizedNodes,
        edges: normalizedEdges,
      }),
    });

    return this.store.save(nextSession);
  }

  private async requireSession(sessionId: string): Promise<Session> {
    const session = await this.store.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return session;
  }
}
