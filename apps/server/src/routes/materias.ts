import type Database from "better-sqlite3";
import { Router } from "express";
import type { Materia } from "@organizador/shared";
import { eliminarMateria, guardarMateria, listarMaterias } from "../entidades/materias";
import { generarId } from "../lib/id";

export function crearRouterMaterias(db: Database.Database) {
  const router = Router();

  router.get("/", (req, res) => {
    const desde = typeof req.query.desde === "string" ? req.query.desde : null;
    res.json(listarMaterias(db, desde));
  });

  router.post("/", (req, res) => {
    const cuerpo = (req.body ?? {}) as Partial<Materia>;
    if (!cuerpo.nombre || !cuerpo.horarios || !cuerpo.desde || !cuerpo.hasta) {
      res.status(400).json({ error: "nombre, horarios, desde y hasta son obligatorios" });
      return;
    }
    const { id: _ignorado, ...patch } = cuerpo;
    const ahora = new Date().toISOString();
    const id = typeof cuerpo.id === "string" && cuerpo.id ? cuerpo.id : generarId("materia");
    res.status(201).json(
      guardarMateria(db, id, { overrides: {}, eliminados: [], fechasImportantes: [], ...patch }, ahora),
    );
  });

  router.patch("/:id", (req, res) => {
    const ahora = new Date().toISOString();
    res.json(guardarMateria(db, req.params.id, (req.body ?? {}) as Partial<Materia>, ahora));
  });

  router.delete("/:id", (req, res) => {
    const ahora = new Date().toISOString();
    res.json(eliminarMateria(db, req.params.id, ahora));
  });

  return router;
}
