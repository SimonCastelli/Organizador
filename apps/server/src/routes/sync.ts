import type Database from "better-sqlite3";
import { Router } from "express";
import { guardarCalendario, listarCalendarios } from "../entidades/calendarios";
import { guardarEvento, listarEventos } from "../entidades/eventos";
import { guardarMateria, listarMaterias } from "../entidades/materias";
import { guardarSettings, obtenerSettings } from "../entidades/settings";
import { guardarTarea, listarTareas } from "../entidades/tareas";

type EntidadSync = "evento" | "tarea" | "materia" | "calendario" | "settings";

interface Mutacion {
  entidad: EntidadSync;
  /** No hace falta para "settings" (es un singleton). */
  id?: string;
  patch: Record<string, unknown>;
  /** ISO — el momento en que el cliente hizo el cambio, no en que sincroniza. */
  timestamp: string;
}

interface ErrorMutacion {
  entidad: string;
  id: string;
  error: string;
}

function aplicarMutacion(db: Database.Database, m: Mutacion): void {
  switch (m.entidad) {
    case "evento":
      if (!m.id) throw new Error("falta id");
      guardarEvento(db, m.id, m.patch, m.timestamp);
      return;
    case "tarea":
      if (!m.id) throw new Error("falta id");
      guardarTarea(db, m.id, m.patch, m.timestamp);
      return;
    case "materia":
      if (!m.id) throw new Error("falta id");
      guardarMateria(db, m.id, m.patch, m.timestamp);
      return;
    case "calendario":
      if (!m.id) throw new Error("falta id");
      guardarCalendario(db, m.id, m.patch, m.timestamp);
      return;
    case "settings":
      guardarSettings(db, m.patch, m.timestamp);
      return;
    default:
      throw new Error(`entidad desconocida: ${m.entidad as string}`);
  }
}

/**
 * POST /api/sync — el corazón del offline-first: el cliente manda todas las
 * mutaciones que encoló mientras no había red (`mutaciones`) más el cursor
 * de la última vez que sincronizó (`desde`); el servidor las aplica con
 * last-write-wins por campo (ver lib/lww.ts) y devuelve todo lo que cambió
 * en el servidor desde ese cursor — incluidos tombstones — para que el
 * cliente actualice su copia local. Una mutación que falla (p.ej. un patch
 * inválido) no aborta el batch: queda en `errores` y el resto sigue.
 */
export function crearRouterSync(db: Database.Database) {
  const router = Router();

  router.post("/", (req, res) => {
    const cuerpo = (req.body ?? {}) as { desde?: string | null; mutaciones?: Mutacion[] };
    const desde = cuerpo.desde ?? null;
    const errores: ErrorMutacion[] = [];
    let aplicadas = 0;

    for (const mutacion of cuerpo.mutaciones ?? []) {
      try {
        aplicarMutacion(db, mutacion);
        aplicadas++;
      } catch (error) {
        errores.push({ entidad: mutacion.entidad, id: mutacion.id ?? "", error: (error as Error).message });
      }
    }

    res.json({
      servidorTimestamp: new Date().toISOString(),
      aplicadas,
      errores,
      cambios: {
        eventos: listarEventos(db, desde),
        tareas: listarTareas(db, desde),
        materias: listarMaterias(db, desde),
        calendarios: listarCalendarios(db, desde),
        settings: obtenerSettings(db),
      },
    });
  });

  return router;
}
