import type Database from "better-sqlite3";
import { Router } from "express";
import type { Tarea } from "@organizador/shared";
import { eliminarTarea, guardarTarea, listarTareas } from "../entidades/tareas";
import { generarId } from "../lib/id";

export function crearRouterTareas(db: Database.Database) {
  const router = Router();

  router.get("/", (req, res) => {
    const desde = typeof req.query.desde === "string" ? req.query.desde : null;
    res.json(listarTareas(db, desde));
  });

  router.post("/", (req, res) => {
    const cuerpo = (req.body ?? {}) as Partial<Tarea>;
    if (!cuerpo.titulo) {
      res.status(400).json({ error: "titulo es obligatorio" });
      return;
    }
    const { id: _ignorado, ...patch } = cuerpo;
    const ahora = new Date().toISOString();
    const id = typeof cuerpo.id === "string" && cuerpo.id ? cuerpo.id : generarId("tarea");
    res.status(201).json(guardarTarea(db, id, { hecha: false, fecha: null, ...patch }, ahora));
  });

  router.patch("/:id", (req, res) => {
    const ahora = new Date().toISOString();
    res.json(guardarTarea(db, req.params.id, (req.body ?? {}) as Partial<Tarea>, ahora));
  });

  router.delete("/:id", (req, res) => {
    const ahora = new Date().toISOString();
    res.json(eliminarTarea(db, req.params.id, ahora));
  });

  return router;
}
