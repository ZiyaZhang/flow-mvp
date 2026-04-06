import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { FlowSessionService } from "../session/service.js";
import { registerPrompts } from "./prompts.js";
import { registerTools } from "./tools.js";

export function createMcpServer(service: FlowSessionService): McpServer {
  const server = new McpServer({
    name: "flow-mvp",
    version: "0.1.0",
  });

  registerTools(server, service);
  registerPrompts(server, service);

  return server;
}
