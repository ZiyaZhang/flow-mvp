import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { FlowSessionService } from "../session/service.js";

export function registerPrompts(server: McpServer, service: FlowSessionService): void {
  server.registerPrompt(
    "start",
    {
      title: "Flow MVP Start",
      description: "Create a localhost flow-editing session for requirement decomposition.",
      argsSchema: {
        title: z.string().describe("The requirement or feature title."),
        brief: z.string().describe("A short brief describing the requirement."),
      },
    },
    async ({ title, brief }) => {
      return {
        description: "Starts a browser-based flow editing session.",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: [
                "Call the `start_session` tool with the following arguments.",
                `title: ${title}`,
                `brief: ${brief}`,
                "",
                "After the tool returns:",
                "1. Tell the user to open the returned `localUrl` in the browser.",
                "2. Tell the user to edit the flow in the browser and click the save button.",
                "3. Tell the user to come back and run `/flow-mvp:resume` when finished.",
                "4. Do not generate the final markdown or mermaid until the user resumes.",
              ].join("\n"),
            },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    "resume",
    {
      title: "Flow MVP Resume",
      description: "Resume the latest flow session or a specific session by id.",
      argsSchema: {
        sessionId: z.string().optional().describe("Optional session id. If omitted, use the latest local session."),
      },
    },
    async ({ sessionId }) => {
      const latest = sessionId ? null : await service.getLatestSession();
      const resolvedSessionId = sessionId ?? latest?.sessionId;

      if (!resolvedSessionId) {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: [
                  "No recent flow session was found.",
                  "Ask the user to run `/flow-mvp:start` first or provide a specific `sessionId`.",
                ].join("\n"),
              },
            },
          ],
        };
      }

      return {
        description: "Continues a saved browser session from localhost sidecar storage.",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: [
                `Use sessionId: ${resolvedSessionId}`,
                "",
                "Workflow:",
                "1. Call `get_session_state` first.",
                "2. If the session is not completed, tell the user to reopen `localUrl`, finish editing, and save.",
                "3. If the session is completed, call `get_session_result`.",
                "4. Then call `apply_session_result` for `markdown`, `mermaid`, and `json` as needed.",
                "5. Present the exported artifacts clearly so the user can continue with implementation.",
              ].join("\n"),
            },
          },
        ],
      };
    },
  );
}
