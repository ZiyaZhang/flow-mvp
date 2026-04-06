import { z } from "zod";

export const flowNodeTypeSchema = z.enum(["start", "step", "decision", "end"]);

export const flowEdgeTypeSchema = z.enum(["sequence", "parent_child"]);

export const flowNodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(""),
  type: flowNodeTypeSchema.default("step"),
  order: z.number().int().nonnegative(),
  parentId: z.string().min(1).nullable().optional(),
});

export const flowEdgeSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
  type: flowEdgeTypeSchema.default("sequence"),
});

export const sessionStatusSchema = z.enum(["draft", "in_progress", "completed"]);

export const sessionExportsSchema = z.object({
  markdown: z.string().default(""),
  mermaid: z.string().default(""),
  json: z.string().default(""),
});

export const sessionSchema = z.object({
  sessionId: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  status: sessionStatusSchema,
  title: z.string().min(1),
  brief: z.string().min(1),
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
  exports: sessionExportsSchema,
});

export const startSessionInputSchema = z.object({
  title: z.string().min(1),
  brief: z.string().min(1),
  initialNodes: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        type: flowNodeTypeSchema.optional(),
      }),
    )
    .optional(),
});

export const getSessionStateInputSchema = z.object({
  sessionId: z.string().min(1),
});

export const getSessionResultInputSchema = z.object({
  sessionId: z.string().min(1),
});

export const applySessionResultInputSchema = z.object({
  sessionId: z.string().min(1),
  format: z.enum(["markdown", "mermaid", "json"]),
});

export const startSessionResultSchema = z.object({
  sessionId: z.string().min(1),
  localUrl: z.string().url(),
  status: sessionStatusSchema,
  summary: z.string().min(1),
  initialData: z.object({
    title: z.string().min(1),
    brief: z.string().min(1),
    nodes: z.array(flowNodeSchema),
    edges: z.array(flowEdgeSchema),
  }),
});

export const sessionStateResultSchema = z.object({
  sessionId: z.string().min(1),
  status: sessionStatusSchema,
  updatedAt: z.string().min(1),
  completed: z.boolean(),
  title: z.string().min(1),
  brief: z.string().min(1),
  nodeCount: z.number().int().nonnegative(),
  edgeCount: z.number().int().nonnegative(),
  localUrl: z.string().url(),
});

export const sessionResultSchema = z.object({
  sessionId: z.string().min(1),
  status: sessionStatusSchema,
  updatedAt: z.string().min(1),
  title: z.string().min(1),
  brief: z.string().min(1),
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
  markdown: z.string(),
  mermaid: z.string(),
  json: z.string(),
});

export const applySessionResultOutputSchema = z.object({
  sessionId: z.string().min(1),
  format: z.enum(["markdown", "mermaid", "json"]),
  content: z.string(),
});

export type SessionSchema = z.infer<typeof sessionSchema>;
