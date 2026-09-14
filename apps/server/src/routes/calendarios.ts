import type Database from "better-sqlite3";
import { Router } from "express";
import type { Calendario } from "@organizador/shared";
import { guardarCalendario, listarCalendarios } from "../entidades/calendarios";

/** Los 5 calendarios de categoría vienen precargados por la migración
 * inicial; esta ruta solo permite tocar `visible` (y, desde la Fase 2, los
 * calendarios de Google que agregue el propio flujo de OAuth). No hay
 * POST/DELETE genérico: crear/borrar calendarios no es una operación de
 * usuario en la Fase 1. */
export function crearRouterCalendarios(db: Database.Database) {
  const router = Router();

  router.get("/", (req, res) => {
    const desde = typeof req.query.desde === "string" ? req.query.desde : null;
    res.json(listarCalendarios(db, desde));
  });

  router.patch("/:id", (req, res) => {
    const ahora = new Date().toISOString();
    res.json(guardarCalendario(db, req.params.id, (req.body ?? {}) as Partial<Calendario>, ahora));
  });

  return router;
}
