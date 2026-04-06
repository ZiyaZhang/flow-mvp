import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  applySessionResultInputSchema,
  applySessionResultOutputSchema,
  getSessionResultInputSchema,
  getSessionStateInputSchema,
  sessionResultSchema,
  sessionStateResultSchema,
  startSessionInputSchema,
  startSessionResultSchema,
} from "../../../../packages/shared/src/index.js";
import { FlowSessionService } from "../session/service.js";

function textBlock(label: string, payload: unknown): string {
  return `${label}\n\n${JSON.stringify(payload, null, 2)}`;
}

export function registerTools(server: McpServer, service: FlowSessionService): void {
  server.registerTool(
    "start_session",
    {
      title: "Start Flow Session",
      description:
        "Create a local flow-editing session and return the localhost URL that the user should open in a browser.",
      inputSchema: startSessionInputSchema,
      outputSchema: startSessionResultSchema,
    },
    async (input) => {
      const result = await service.startSession(input);
      return {
        content: [
          {
            type: "text",
            text: textBlock("Flow session created.", result),
          },
        ],
        structuredContent: result,
      };
    },
  );

  server.registerTool(
    "get_session_state",
    {
      title: "Get Flow Session State",
      description: "Read the current state of an existing flow-editing session.",
      inputSchema: getSessionStateInputSchema,
      outputSchema: sessionStateResultSchema,
    },
    async ({ sessionId }) => {
      const result = await service.getSessionState(sessionId);
      return {
        content: [
          {
            type: "text",
            text: textBlock("Flow session state.", result),
          },
        ],
        structuredContent: result,
      };
    },
  );

  server.registerTool(
    "get_session_result",
    {
      title: "Get Flow Session Result",
      description:
        "Return the full structured session result, including nodes, edges, markdown, mermaid, and JSON exports.",
      inputSchema: getSessionResultInputSchema,
      outputSchema: sessionResultSchema,
    },
    async ({ sessionId }) => {
      const result = await service.getSessionResult(sessionId);
      return {
        content: [
          {
            type: "text",
            text: textBlock("Flow session result.", result),
          },
        ],
        structuredContent: result,
      };
    },
  );

  server.registerTool(
    "apply_session_result",
    {
      title: "Apply Flow Session Result",
      description:
        "Return a markdown, mermaid, or JSON representation that can be pasted directly into a follow-up LLM prompt.",
      inputSchema: applySessionResultInputSchema,
      outputSchema: applySessionResultOutputSchema,
    },
    async ({ sessionId, format }) => {
      const result = await service.applySessionResult(sessionId, format);
      return {
        content: [
          {
            type: "text",
            text: result.content,
          },
        ],
        structuredContent: result,
      };
    },
  );
}
