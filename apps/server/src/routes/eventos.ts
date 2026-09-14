import type Database from "better-sqlite3";
import { Router } from "express";
import type { Evento } from "@organizador/shared";
import { eliminarEvento, guardarEvento, listarEventos } from "../entidades/eventos";
import { generarId } from "../lib/id";

export function crearRouterEventos(db: Database.Database) {
  const router = Router();

  router.get("/", (req, res) => {
    const desde = typeof req.query.desde === "string" ? req.query.desde : null;
    res.json(listarEventos(db, desde));
  });

  router.post("/", (req, res) => {
    const cuerpo = (req.body ?? {}) as Partial<Evento>;
    if (!cuerpo.calendarioId || !cuerpo.titulo || !cuerpo.inicio || !cuerpo.fin) {
      res.status(400).json({ error: "calendarioId, titulo, inicio y fin son obligatorios" });
      return;
    }
    const { id: _ignorado, ...patch } = cuerpo;
    const ahora = new Date().toISOString();
    const id = typeof cuerpo.id === "string" && cuerpo.id ? cuerpo.id : generarId("evento");
    res.status(201).json(guardarEvento(db, id, { origen: "manual", ...patch }, ahora));
  });

  router.patch("/:id", (req, res) => {
    const ahora = new Date().toISOString();
    res.json(guardarEvento(db, req.params.id, (req.body ?? {}) as Partial<Evento>, ahora));
  });

  router.delete("/:id", (req, res) => {
    const ahora = new Date().toISOString();
    res.json(eliminarEvento(db, req.params.id, ahora));
  });

  return router;
}
