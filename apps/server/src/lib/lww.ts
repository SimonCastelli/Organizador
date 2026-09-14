import type Database from "better-sqlite3";

/** Fila cruda de SQLite: columnas snake_case + las cuatro de control que
 * tiene toda tabla de esta app (`created_at`/`updated_at`/`deleted_at` y el
 * mapa `campo_ts`). */
export interface FilaConMeta {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  campo_ts: string;
  [columna: string]: unknown;
}

function leerCampoTs(fila: Pick<FilaConMeta, "campo_ts"> | undefined): Record<string, string> {
  if (!fila) return {};
  try {
    return JSON.parse(fila.campo_ts) as Record<string, string>;
  } catch {
    return {};
  }
}

/** Upsert genérico con **last-write-wins por campo**: cada columna del
 * patch solo se escribe si su timestamp es más nuevo que el que ya tenía
 * esa columna en particular (no la fila entera). `deleted_at` es una
 * columna más — el tombstone se resuelve con la misma regla. Sirve tanto
 * para las rutas REST directas como para /sync: ambas caen en esta misma
 * función, así nunca se resuelven conflictos de dos formas distintas. */
export function upsertLWW(
  db: Database.Database,
  tabla: string,
  columnasPorDefecto: Record<string, unknown>,
  id: string,
  patch: Record<string, unknown>,
  timestamp: string,
): FilaConMeta {
  const actual = db.prepare(`SELECT * FROM ${tabla} WHERE id = ?`).get(id) as FilaConMeta | undefined;
  const campoTs: Record<string, string> = { ...leerCampoTs(actual) };

  const base: Record<string, unknown> = actual
    ? { ...actual }
    : { id, created_at: timestamp, ...columnasPorDefecto };

  for (const [columna, valor] of Object.entries(patch)) {
    const previo = campoTs[columna];
    if (!previo || timestamp > previo) {
      base[columna] = valor;
      campoTs[columna] = timestamp;
    }
  }

  const timestamps = Object.values(campoTs);
  base.updated_at = timestamps.length > 0 ? timestamps.reduce((a, b) => (a > b ? a : b)) : timestamp;
  base.campo_ts = JSON.stringify(campoTs);

  const columnas = Object.keys(base);
  const marcadores = columnas.map(() => "?").join(", ");
  const actualizaciones = columnas
    .filter((c) => c !== "id")
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");

  db.prepare(
    `INSERT INTO ${tabla} (${columnas.join(", ")}) VALUES (${marcadores})
     ON CONFLICT(id) DO UPDATE SET ${actualizaciones}`,
  ).run(...columnas.map((c) => base[c] as string | number | null));

  return db.prepare(`SELECT * FROM ${tabla} WHERE id = ?`).get(id) as FilaConMeta;
}

/** Filas de `tabla` con `updated_at` estrictamente posterior a `desde`
 * (incluye tombstones: el cliente necesita verlas para borrar su copia
 * local). Sin `desde`, devuelve todo lo no borrado — para la carga inicial. */
export function filasDesde(db: Database.Database, tabla: string, desde: string | null): FilaConMeta[] {
  if (desde) {
    return db.prepare(`SELECT * FROM ${tabla} WHERE updated_at > ? ORDER BY updated_at ASC`).all(desde) as FilaConMeta[];
  }
  return db.prepare(`SELECT * FROM ${tabla} WHERE deleted_at IS NULL ORDER BY updated_at ASC`).all() as FilaConMeta[];
}
