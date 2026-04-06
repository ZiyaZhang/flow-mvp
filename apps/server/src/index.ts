import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createHttpApp } from "./http/app.js";
import { loadConfig } from "./config.js";
import { createMcpServer } from "./mcp/server.js";
import { FlowSessionService } from "./session/service.js";
import { SessionStore } from "./session/store.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const store = new SessionStore(config.dataDir);
  await store.ensure();

  const service = new FlowSessionService(store, config);
  const app = createHttpApp(service, config);

  await new Promise<void>((resolve) => {
    app.listen(config.port, config.host, () => {
      console.error(`[flow-mvp] HTTP listening on http://${config.host}:${config.port}`);
      resolve();
    });
  });

  const server = createMcpServer(service);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[flow-mvp] MCP stdio server connected");
}

main().catch((error) => {
  console.error("[flow-mvp] fatal error:", error);
  process.exit(1);
});
