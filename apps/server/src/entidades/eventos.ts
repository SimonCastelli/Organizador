import type Database from "better-sqlite3";
import type { Evento } from "@organizador/shared";
import { filasDesde, upsertLWW, type FilaConMeta } from "../lib/lww";
import { camelASnake } from "../lib/texto";

const TABLA = "eventos";
const COLUMNAS_POR_DEFECTO = { todo_el_dia: 0, origen: "manual" };

function filaAEvento(fila: FilaConMeta): Evento {
  return {
    id: fila.id,
    calendarioId: fila.calendario_id as string,
    titulo: fila.titulo as string,
    inicio: fila.inicio as string,
    fin: fila.fin as string,
    todoElDia: Boolean(fila.todo_el_dia),
    lugar: (fila.lugar as string | null) ?? undefined,
    notas: (fila.notas as string | null) ?? undefined,
    origen: fila.origen as Evento["origen"],
    materiaId: (fila.materia_id as string | null) ?? undefined,
    tareaId: (fila.tarea_id as string | null) ?? undefined,
    createdAt: fila.created_at,
    updatedAt: fila.updated_at,
    deletedAt: fila.deleted_at,
  };
}

/** Patch de la API (camelCase) -> columnas de SQLite (snake_case). Los
 * booleans se guardan como 0/1: SQLite no tiene tipo boolean nativo. */
function patchAColumnas(patch: Partial<Evento>): Record<string, unknown> {
  const columnas: Record<string, unknown> = {};
  for (const [campo, valor] of Object.entries(patch)) {
    if (valor === undefined) continue;
    columnas[camelASnake(campo)] = typeof valor === "boolean" ? (valor ? 1 : 0) : valor;
  }
  return columnas;
}

export function listarEventos(db: Database.Database, desde: string | null): Evento[] {
  return filasDesde(db, TABLA, desde).map(filaAEvento);
}

export function guardarEvento(db: Database.Database, id: string, patch: Partial<Evento>, timestamp: string): Evento {
  const fila = upsertLWW(db, TABLA, COLUMNAS_POR_DEFECTO, id, patchAColumnas(patch), timestamp);
  return filaAEvento(fila);
}

export function eliminarEvento(db: Database.Database, id: string, timestamp: string): Evento {
  return guardarEvento(db, id, { deletedAt: timestamp } as Partial<Evento>, timestamp);
}
