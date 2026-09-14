import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import type Database from "better-sqlite3";
import { requiereAuth } from "./middleware/auth";
import { crearRouterAuth } from "./routes/auth";
import { crearRouterCalendarios } from "./routes/calendarios";
import { crearRouterEventos } from "./routes/eventos";
import { crearRouterMaterias } from "./routes/materias";
import { crearRouterSettings } from "./routes/settings";
import { crearRouterSync } from "./routes/sync";
import { crearRouterTareas } from "./routes/tareas";

/** Fábrica de la app de Express, separada de `index.ts` (que la levanta)
 * para poder testearla con supertest sin abrir un puerto real. */
export function crearApp(db: Database.Database): Express {
  const app = express();

  app.use(
    cors({
      origin: process.env.ORIGEN_PERMITIDO ?? true,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  // Sin auth: para health checks (Docker/VPS) y para poder loguearse.
  app.get("/api/salud", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", crearRouterAuth());

  app.use("/api", requiereAuth);
  app.use("/api/eventos", crearRouterEventos(db));
  app.use("/api/tareas", crearRouterTareas(db));
  app.use("/api/materias", crearRouterMaterias(db));
  app.use("/api/settings", crearRouterSettings(db));
  app.use("/api/calendarios", crearRouterCalendarios(db));
  app.use("/api/sync", crearRouterSync(db));

  return app;
}
