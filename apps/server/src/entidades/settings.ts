import type Database from "better-sqlite3";
import type { Settings } from "@organizador/shared";
import { upsertLWW, type FilaConMeta } from "../lib/lww";
import { camelASnake } from "../lib/texto";

const TABLA = "settings";
const ID_SINGLETON = "singleton";
const COLUMNAS_POR_DEFECTO = { avisos_eventos_proximos: 1, minutos_antes_aviso: 10, simular_sin_conexion: 0 };

function filaASettings(fila: FilaConMeta): Settings {
  return {
    avisosEventosProximos: Boolean(fila.avisos_eventos_proximos),
    minutosAntesAviso: fila.minutos_antes_aviso as number,
    simularSinConexion: Boolean(fila.simular_sin_conexion),
    ultimaSincronizacion: (fila.ultima_sincronizacion as string | null) ?? null,
    updatedAt: fila.updated_at,
  };
}

function patchAColumnas(patch: Partial<Settings>): Record<string, unknown> {
  const columnas: Record<string, unknown> = {};
  for (const [campo, valor] of Object.entries(patch)) {
    if (valor === undefined || campo === "updatedAt") continue;
    columnas[camelASnake(campo)] = typeof valor === "boolean" ? (valor ? 1 : 0) : valor;
  }
  return columnas;
}

export function obtenerSettings(db: Database.Database): Settings {
  const fila = db.prepare(`SELECT * FROM ${TABLA} WHERE id = ?`).get(ID_SINGLETON) as FilaConMeta;
  return filaASettings(fila);
}

export function guardarSettings(db: Database.Database, patch: Partial<Settings>, timestamp: string): Settings {
  const fila = upsertLWW(db, TABLA, COLUMNAS_POR_DEFECTO, ID_SINGLETON, patchAColumnas(patch), timestamp);
  return filaASettings(fila);
}
