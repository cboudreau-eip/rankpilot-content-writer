import "dotenv/config";
import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

/**
 * Builds the API-only Express app (no static/Vite serving) — shared between
 * the local/traditional server entry (server/_core/index.ts) and the Vercel
 * serverless entry (server.ts at the repo root).
 */
export function createApiApp(): Express {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  return app;
}
