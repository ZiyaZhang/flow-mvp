import path from "node:path";
import { fileURLToPath } from "node:url";

export type AppConfig = {
  host: "127.0.0.1";
  port: number;
  repoRoot: string;
  dataDir: string;
  webDistDir: string;
  webOrigin?: string;
};

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "../../../");

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(): AppConfig {
  const host = "127.0.0.1" as const;
  const port = parsePort(process.env.FLOW_MVP_PORT, 4318);
  const dataDir = process.env.FLOW_MVP_DATA_DIR
    ? path.resolve(process.env.FLOW_MVP_DATA_DIR)
    : path.join(repoRoot, "data/sessions");
  const webDistDir = process.env.FLOW_MVP_WEB_DIST
    ? path.resolve(process.env.FLOW_MVP_WEB_DIST)
    : path.join(repoRoot, "apps/web/dist");
  const webOrigin = process.env.FLOW_MVP_WEB_ORIGIN?.trim() || undefined;

  return {
    host,
    port,
    repoRoot,
    dataDir,
    webDistDir,
    webOrigin,
  };
}

export function buildLocalUrl(config: AppConfig, sessionId: string): string {
  if (config.webOrigin) {
    return `${config.webOrigin.replace(/\/$/, "")}/app/${sessionId}`;
  }

  return `http://${config.host}:${config.port}/app/${sessionId}`;
}
