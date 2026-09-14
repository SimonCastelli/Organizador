import type Database from "better-sqlite3";
import type { Calendario } from "@organizador/shared";
import { filasDesde, upsertLWW, type FilaConMeta } from "../lib/lww";
import { camelASnake } from "../lib/texto";

const TABLA = "calendarios";
const COLUMNAS_POR_DEFECTO = { visible: 1, origen: "local" };

function filaACalendario(fila: FilaConMeta): Calendario {
  return {
    id: fila.id,
    nombre: fila.nombre as string,
    categoria: fila.categoria as Calendario["categoria"],
    visible: Boolean(fila.visible),
    origen: fila.origen as Calendario["origen"],
    cuentaGoogleId: (fila.cuenta_google_id as string | null) ?? undefined,
    updatedAt: fila.updated_at,
    deletedAt: fila.deleted_at,
  };
}

function patchAColumnas(patch: Partial<Calendario>): Record<string, unknown> {
  const columnas: Record<string, unknown> = {};
  for (const [campo, valor] of Object.entries(patch)) {
    if (valor === undefined) continue;
    columnas[camelASnake(campo)] = typeof valor === "boolean" ? (valor ? 1 : 0) : valor;
  }
  return columnas;
}

export function listarCalendarios(db: Database.Database, desde: string | null): Calendario[] {
  return filasDesde(db, TABLA, desde).map(filaACalendario);
}

export function guardarCalendario(
  db: Database.Database,
  id: string,
  patch: Partial<Calendario>,
  timestamp: string,
): Calendario {
  const fila = upsertLWW(db, TABLA, COLUMNAS_POR_DEFECTO, id, patchAColumnas(patch), timestamp);
  return filaACalendario(fila);
}
