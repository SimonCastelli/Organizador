import Database from "better-sqlite3";
import fs from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Abre (y crea si no existe) la base SQLite en `rutaArchivo`, corriendo las
 * migraciones pendientes de `src/migrations/*.sql` en orden. `:memory:` para
 * tests. */
export function abrirDb(rutaArchivo: string): Database.Database {
  if (rutaArchivo !== ":memory:") mkdirSync(dirname(rutaArchivo), { recursive: true });

  const db = new Database(rutaArchivo);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  correrMigraciones(db);
  return db;
}

function correrMigraciones(db: Database.Database): void {
  db.exec("CREATE TABLE IF NOT EXISTS migraciones (nombre TEXT PRIMARY KEY, aplicada_en TEXT NOT NULL)");
  const aplicadas = new Set(
    (db.prepare("SELECT nombre FROM migraciones").all() as { nombre: string }[]).map((r) => r.nombre),
  );

  const carpeta = join(__dirname, "migrations");
  const archivos = fs
    .readdirSync(carpeta)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const insertar = db.prepare("INSERT INTO migraciones (nombre, aplicada_en) VALUES (?, ?)");
  for (const archivo of archivos) {
    if (aplicadas.has(archivo)) continue;
    const sql = fs.readFileSync(join(carpeta, archivo), "utf-8");
    db.transaction(() => {
      db.exec(sql);
      insertar.run(archivo, new Date().toISOString());
    })();
  }
}
