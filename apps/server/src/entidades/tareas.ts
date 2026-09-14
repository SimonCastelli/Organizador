import type Database from "better-sqlite3";
import type { Tarea } from "@organizador/shared";
import { filasDesde, upsertLWW, type FilaConMeta } from "../lib/lww";
import { camelASnake } from "../lib/texto";

const TABLA = "tareas";
const COLUMNAS_POR_DEFECTO = { hecha: 0 };

function filaATarea(fila: FilaConMeta): Tarea {
  return {
    id: fila.id,
    titulo: fila.titulo as string,
    hecha: Boolean(fila.hecha),
    fecha: (fila.fecha as string | null) ?? null,
    materiaId: (fila.materia_id as string | null) ?? undefined,
    notas: (fila.notas as string | null) ?? undefined,
    createdAt: fila.created_at,
    updatedAt: fila.updated_at,
    deletedAt: fila.deleted_at,
  };
}

function patchAColumnas(patch: Partial<Tarea>): Record<string, unknown> {
  const columnas: Record<string, unknown> = {};
  for (const [campo, valor] of Object.entries(patch)) {
    if (valor === undefined) continue;
    columnas[camelASnake(campo)] = typeof valor === "boolean" ? (valor ? 1 : 0) : valor;
  }
  return columnas;
}

export function listarTareas(db: Database.Database, desde: string | null): Tarea[] {
  return filasDesde(db, TABLA, desde).map(filaATarea);
}

export function guardarTarea(db: Database.Database, id: string, patch: Partial<Tarea>, timestamp: string): Tarea {
  const fila = upsertLWW(db, TABLA, COLUMNAS_POR_DEFECTO, id, patchAColumnas(patch), timestamp);
  return filaATarea(fila);
}

export function eliminarTarea(db: Database.Database, id: string, timestamp: string): Tarea {
  return guardarTarea(db, id, { deletedAt: timestamp } as Partial<Tarea>, timestamp);
}
