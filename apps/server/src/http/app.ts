import fs from "node:fs";
import path from "node:path";

import cors from "cors";
import express from "express";

import type { AppConfig } from "../config.js";
import { FlowSessionService } from "../session/service.js";

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  return /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin);
}

export function createHttpApp(service: FlowSessionService, config: AppConfig) {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, isAllowedOrigin(origin));
      },
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      host: config.host,
      port: config.port,
      dataDir: config.dataDir,
      webOrigin: config.webOrigin ?? null,
    });
  });

  app.get("/api/sessions/:sessionId", async (req, res, next) => {
    try {
      const session = await service.getSession(req.params.sessionId);
      res.json(session);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/sessions/:sessionId", async (req, res, next) => {
    try {
      const session = await service.saveDraft(req.params.sessionId, req.body);
      res.json(session);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/sessions/:sessionId/complete", async (req, res, next) => {
    try {
      const session = await service.completeSession(req.params.sessionId, req.body);
      res.json(session);
    } catch (error) {
      next(error);
    }
  });

  if (config.webOrigin) {
    app.get("/", (_req, res) => {
      res.redirect(config.webOrigin!);
    });

    app.get("/app/:sessionId", (req, res) => {
      res.redirect(`${config.webOrigin!.replace(/\/$/, "")}/app/${req.params.sessionId}`);
    });
  } else if (fs.existsSync(config.webDistDir)) {
    app.use(express.static(config.webDistDir));

    app.get("/app/:sessionId", (_req, res) => {
      res.sendFile(path.join(config.webDistDir, "index.html"));
    });

    app.get("/", (_req, res) => {
      res.sendFile(path.join(config.webDistDir, "index.html"));
    });
  } else {
    app.get(["/", "/app/:sessionId"], (_req, res) => {
      res.status(503).type("html").send(`
        <html>
          <body style="font-family: sans-serif; padding: 24px;">
            <h1>flow-mvp web bundle not found</h1>
            <p>Run <code>npm run build:web</code> or set <code>FLOW_MVP_WEB_ORIGIN</code> for Vite dev mode.</p>
          </body>
        </html>
      `);
    });
  }

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    const statusCode = message.startsWith("Session not found") ? 404 : 400;
    res.status(statusCode).json({ error: message });
  });

  return app;
}
