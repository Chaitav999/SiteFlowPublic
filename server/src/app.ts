import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { getEnv } from "./config/env.js";
import { logger } from "./config/logger.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import authRouter from "./modules/auth/routes.js";
import crewsRouter from "./modules/crews/routes.js";
import projectsRouter from "./modules/projects/routes.js";
import fieldJobsRouter from "./modules/field-jobs/routes.js";
import workOrdersRouter from "./modules/work-orders/routes.js";
import inspectionsRouter from "./modules/inspections/routes.js";
import deficienciesRouter from "./modules/deficiencies/routes.js";
import measurementsRouter from "./modules/measurements/routes.js";
import photosRouter from "./modules/photos/routes.js";
import notificationsRouter from "./modules/notifications/routes.js";
import notesRouter from "./modules/notes/routes.js";
import syncRouter from "./modules/sync/routes.js";

export function createApp() {
  const app = express();
  const { corsOrigins } = getEnv();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Origin is not allowed by CORS"));
      },
    }),
  );
  app.use(express.json({ limit: "12mb" }));
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger().info(`${req.method} ${req.path}`);
    next();
  });

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "siteflow-api",
      supabaseConfigured: Boolean(
        process.env.SUPABASE_URL &&
        (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY),
      ),
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/crews", requireAuth, crewsRouter);
  app.use("/api/projects", requireAuth, projectsRouter);
  app.use("/api/jobs", requireAuth, fieldJobsRouter);
  app.use("/api/work-orders", requireAuth, workOrdersRouter);
  app.use("/api/inspections", requireAuth, inspectionsRouter);
  app.use("/api/deficiencies", requireAuth, deficienciesRouter);
  app.use("/api/measurements", requireAuth, measurementsRouter);
  app.use("/api/photos", requireAuth, photosRouter);
  app.use("/api/notifications", requireAuth, notificationsRouter);
  app.use("/api/notes", requireAuth, notesRouter);
  app.use("/api/sync", requireAuth, syncRouter);

  app.use((req: Request, res: Response) => {
    res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
  });

  app.use(errorHandler);

  return app;
}
