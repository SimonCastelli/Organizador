import type Database from "better-sqlite3";
import type { Materia } from "@organizador/shared";
import { filasDesde, upsertLWW, type FilaConMeta } from "../lib/lww";
import { camelASnake } from "../lib/texto";

const TABLA = "materias";
const COLUMNAS_JSON = ["horarios", "fechas_importantes", "overrides", "eliminados"];
const COLUMNAS_POR_DEFECTO = { horarios: "[]", fechas_importantes: "[]", overrides: "{}", eliminados: "[]" };

function jsonSeguro<T>(texto: unknown, porDefecto: T): T {
  if (typeof texto !== "string") return porDefecto;
  try {
    return JSON.parse(texto) as T;
  } catch {
    return porDefecto;
  }
}

function filaAMateria(fila: FilaConMeta): Materia {
  return {
    id: fila.id,
    nombre: fila.nombre as string,
    horarios: jsonSeguro(fila.horarios, []),
    desde: fila.desde as string,
    hasta: fila.hasta as string,
    fechasImportantes: jsonSeguro(fila.fechas_importantes, []),
    overrides: jsonSeguro(fila.overrides, {}),
    eliminados: jsonSeguro(fila.eliminados, []),
    createdAt: fila.created_at,
    updatedAt: fila.updated_at,
    deletedAt: fila.deleted_at,
  };
}

function patchAColumnas(patch: Partial<Materia>): Record<string, unknown> {
  const columnas: Record<string, unknown> = {};
  for (const [campo, valor] of Object.entries(patch)) {
    if (valor === undefined) continue;
    const columna = camelASnake(campo);
    if (COLUMNAS_JSON.includes(columna)) {
      columnas[columna] = JSON.stringify(valor);
    } else {
      columnas[columna] = typeof valor === "boolean" ? (valor ? 1 : 0) : valor;
    }
  }
  return columnas;
}

export function listarMaterias(db: Database.Database, desde: string | null): Materia[] {
  return filasDesde(db, TABLA, desde).map(filaAMateria);
}

export function guardarMateria(db: Database.Database, id: string, patch: Partial<Materia>, timestamp: string): Materia {
  const fila = upsertLWW(db, TABLA, COLUMNAS_POR_DEFECTO, id, patchAColumnas(patch), timestamp);
  return filaAMateria(fila);
}

export function eliminarMateria(db: Database.Database, id: string, timestamp: string): Materia {
  return guardarMateria(db, id, { deletedAt: timestamp } as Partial<Materia>, timestamp);
}
