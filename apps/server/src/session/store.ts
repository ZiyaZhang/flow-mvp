import fs from "node:fs/promises";
import path from "node:path";

import { sessionSchema, type Session } from "../../../../packages/shared/src/index.js";

export class SessionStore {
  constructor(private readonly dataDir: string) {}

  async ensure(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
  }

  async save(session: Session): Promise<Session> {
    const parsed = sessionSchema.parse(session);
    await fs.writeFile(this.filePath(parsed.sessionId), JSON.stringify(parsed, null, 2), "utf8");
    return parsed;
  }

  async get(sessionId: string): Promise<Session | null> {
    try {
      const raw = await fs.readFile(this.filePath(sessionId), "utf8");
      return sessionSchema.parse(JSON.parse(raw));
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return null;
      }

      throw error;
    }
  }

  async list(): Promise<Session[]> {
    await this.ensure();
    const entries = await fs.readdir(this.dataDir, { withFileTypes: true });
    const sessions: Session[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) {
        continue;
      }

      const raw = await fs.readFile(path.join(this.dataDir, entry.name), "utf8");
      sessions.push(sessionSchema.parse(JSON.parse(raw)));
    }

    return sessions.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getLatest(): Promise<Session | null> {
    const sessions = await this.list();
    return sessions[0] ?? null;
  }

  private filePath(sessionId: string): string {
    return path.join(this.dataDir, `${sessionId}.json`);
  }
}
