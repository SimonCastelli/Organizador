import type Database from "better-sqlite3";
import { Router } from "express";
import type { Settings } from "@organizador/shared";
import { guardarSettings, obtenerSettings } from "../entidades/settings";

/** Singleton: no hay id, siempre es la misma fila. */
export function crearRouterSettings(db: Database.Database) {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json(obtenerSettings(db));
  });

  router.patch("/", (req, res) => {
    const ahora = new Date().toISOString();
    res.json(guardarSettings(db, (req.body ?? {}) as Partial<Settings>, ahora));
  });

  return router;
}
