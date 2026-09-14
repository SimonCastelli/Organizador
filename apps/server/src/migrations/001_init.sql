-- Esquema inicial. `campo_ts` guarda, por fila, un JSON {columna: timestampISO}
-- con el último momento en que se escribió cada columna: es lo que permite
-- resolver conflictos last-write-wins por campo en vez de por fila entera.
-- `deleted_at` es un tombstone: una columna más, sujeta al mismo LWW.

CREATE TABLE IF NOT EXISTS eventos (
  id TEXT PRIMARY KEY,
  calendario_id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  inicio TEXT NOT NULL,
  fin TEXT NOT NULL,
  todo_el_dia INTEGER NOT NULL DEFAULT 0,
  lugar TEXT,
  notas TEXT,
  origen TEXT NOT NULL DEFAULT 'manual',
  materia_id TEXT,
  tarea_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  campo_ts TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS tareas (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  hecha INTEGER NOT NULL DEFAULT 0,
  fecha TEXT,
  materia_id TEXT,
  notas TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  campo_ts TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS materias (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  horarios TEXT NOT NULL DEFAULT '[]',
  desde TEXT NOT NULL,
  hasta TEXT NOT NULL,
  fechas_importantes TEXT NOT NULL DEFAULT '[]',
  overrides TEXT NOT NULL DEFAULT '{}',
  eliminados TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  campo_ts TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS calendarios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  visible INTEGER NOT NULL DEFAULT 1,
  origen TEXT NOT NULL DEFAULT 'local',
  cuenta_google_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  campo_ts TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  avisos_eventos_proximos INTEGER NOT NULL DEFAULT 1,
  minutos_antes_aviso INTEGER NOT NULL DEFAULT 10,
  simular_sin_conexion INTEGER NOT NULL DEFAULT 0,
  ultima_sincronizacion TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  campo_ts TEXT NOT NULL DEFAULT '{}'
);

INSERT OR IGNORE INTO settings (id, created_at, updated_at)
  VALUES ('singleton', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO calendarios (id, nombre, categoria, visible, origen, created_at, updated_at) VALUES
  ('facultad', 'Facultad', 'facultad', 1, 'local', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('personal', 'Personal', 'personal', 1, 'local', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('lab', 'Laboratorio', 'lab', 1, 'local', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('tarea', 'Tareas', 'tarea', 1, 'local', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('mail', 'Mails', 'mail', 1, 'local', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
