# Organizador

Calendario + tareas personal para Simón (estudiante de Ingeniería en
Computación, FIE). Usuario único, todo en español rioplatense.

Monorepo con 3 paquetes (npm workspaces):

- **`apps/web`** — el front: Vite + React 19 + TypeScript + date-fns, sin
  librerías de UI. Funciona 100% offline-first: sin servidor configurado
  corre exactamente como la beta de la Fase 0 (persistencia local); con
  `VITE_API_URL` configurado, sincroniza con `apps/server`.
- **`apps/server`** — Node + Express + SQLite (`better-sqlite3`). Usuario
  único, sync offline-first con last-write-wins **por campo**.
- **`packages/shared`** — tipos (`types.ts`) y el parser de lenguaje
  natural (`parse-nl.ts`) que usan tanto el front como el server.

## Cómo correrlo

Requiere Node 22+.

```bash
npm install          # instala las 3 workspaces de una
npm run dev:web       # front en http://localhost:5173 (sin servidor)
npm run dev:server    # server en http://localhost:3001 (necesita apps/server/.env)
```

Otros comandos (todos corren en las 3 workspaces que correspondan):

```bash
npm run build       # tsc --noEmit + build de producción del front
npm test            # vitest: parse-nl, generación de clases, API + LWW del server
npm run test:e2e    # playwright: smoke de las seis vistas (apps/web)
```

### Front solo (beta standalone, como la Fase 0)

Sin nada más que hacer: `npm run dev:web` y listo, persiste en IndexedDB de
ese navegador. Así es como se despliega a GitHub Pages.

### Front + server (offline-first real)

1. `cp apps/server/.env.example apps/server/.env` y completá `AUTH_TOKEN`
   (`openssl rand -hex 32`).
2. `npm run dev:server`.
3. En `apps/web/.env.local`: `VITE_API_URL=http://localhost:3001`.
4. `npm run dev:web`. La primera vez pide el token (pantalla de login, no
   modal) — es el mismo `AUTH_TOKEN` del `.env` del server.

Con el server configurado, cada alta/edición/borrado en el front: (1) se
aplica al toque en pantalla, (2) se guarda en IndexedDB, (3) se encola y se
sube en el siguiente `POST /api/sync` (a los ~1.5s de inactividad, o cuando
vuelve la conexión). El indicador "Al día / Sin conexión · N pendientes"
del topbar refleja el tamaño real de esa cola. El toggle "Simular sin
conexión" (en Ajustes) corta la sincronización sin tocar el estado real de
red del navegador — para probar el flujo offline sin desenchufar nada.

## Servidor: API y sync

Auth de un solo usuario: `AUTH_TOKEN` largo en `.env`, mandado como
`Authorization: Bearer <token>` o guardado en una cookie httpOnly por
`POST /api/auth/login`. Sin registro, sin multiusuario.

- `GET/POST/PATCH/DELETE /api/eventos`, `/api/tareas`, `/api/materias` —
  REST directo (el DELETE es un soft-delete: pone `deletedAt`).
- `GET/PATCH /api/settings` — singleton.
- `GET/PATCH /api/calendarios` — los 5 calendarios de categoría vienen
  precargados; solo se puede tocar `visible` (y, desde la Fase 2, los que
  agregue el propio flujo de OAuth de Google).
- `POST /api/sync` — el corazón offline-first: el cliente manda `desde`
  (cursor de la última sync) + `mutaciones` (lo que encoló sin conexión);
  el servidor las aplica y devuelve todo lo que cambió desde ese cursor
  (tombstones incluidos) para que el cliente actualice su copia local.

Conflictos: **last-write-wins por campo**, no por fila. Cada tabla tiene
una columna oculta `campo_ts` (`{columna: timestampISO}`) — un patch solo
pisa una columna si su timestamp es más nuevo que el que ya tenía *esa*
columna. Si dos dispositivos editan campos distintos del mismo evento
offline, ambos cambios sobreviven al sincronizar. Los borrados son
tombstones (`deletedAt`), sujetos a la misma regla — así una edición vieja
que llega tarde nunca resucita algo que ya se borró después.

Ver `apps/server/src/lib/lww.ts` para la implementación y
`apps/server/test/api.test.ts` para los casos de conflicto testeados.

## Docker (VPS chico o tu PC Linux)

```bash
cp .env.example .env   # completá AUTH_TOKEN
docker compose up -d --build
```

Levanta el server en `:3001` con la SQLite en un volumen (`datos_organizador`,
sobrevive un `docker compose down`). `ORIGEN_PERMITIDO` en `.env` tiene que
apuntar a donde sirvas el front (CORS). Para actualizar: `git pull &&
docker compose up -d --build`.

## Vistas

Hoy · Semana · Mes · Tareas · Facultad · Mails — navegación por la barra
lateral (o `⌘K` / `Ctrl+K` para crear/buscar). Los "Ajustes" (avisos,
minutos de aviso, simular sin conexión) viven en un popover del topbar en
vez de ser una séptima vista.

## Diseño

Manual técnico, no SaaS: papel off-white, negro, gris hormigón y **un solo
acento rojo**. **Inter Black** en mayúsculas y escala enorme para los
títulos de cada vista, **JetBrains Mono** para todo lo demás (nav, datos,
etiquetas). Grilla de 12 columnas visible de fondo en el área de
contenido, numerales de sección grandes junto a cada título (`01 HOY` ...
`06 MAILS`), textura de grano sutil. Sin gradientes de color, bordes
redondeados, sombras difusas ni glassmorphism — los popovers, `⌘K` y el
toast usan una sombra dura sin blur (`6px 6px 0`) en vez de nada.

Las 5 categorías (facultad/personal/tarea/lab/mail) ya no se distinguen
por color — eso chocaba con "un solo acento" — sino por un código mono de
3 letras (`FAC`/`PER`/`TAR`/`LAB`/`MAIL`, ver `src/lib/categorias.ts`). El
rojo queda reservado a "lab" (como una etiqueta de riesgo real) y a lo que
hace algo *ahora*: botones primarios, foco, "hoy", "sin conexión",
"deshacer".

Reglas de interacción: motion < 300ms con ease-out, popovers siempre
anclados al elemento que los abre (nunca modales centrados — ni siquiera
el login), la paleta ⌘K sin animación (y en modo "consola": la única
superficie invertida, negro sobre papel), y ningún flujo destructivo pide
confirmación: borra y ofrece **deshacer por 6 segundos** en un toast.

## Deploy del front

GitHub Pages vía Actions (`.github/workflows/pages.yml`): cada push a
`main` corre tests, build con `GITHUB_PAGES=1` (así `vite.config.ts` pone
`base: "/Organizador/"`) y publica `apps/web/dist/`. Sin `VITE_API_URL` en
ese build, Pages sirve la beta standalone (sin servidor).

## Estado del proyecto

- [x] **Fase 0** — beta del front.
- [x] **Fase 1** — backend Node/Express + SQLite, sync offline-first
      (IndexedDB + cola de mutaciones + LWW por campo), Docker Compose.
- [ ] **Fase 2** — Google Calendar + Gmail (multi-cuenta).
- [ ] **Fase 3** — Web Push + motor de tareas automáticas.
- [ ] **Fase 4** — PWA instalable, TWA en Android, wrapper Tauri en Linux.

Decisiones tomadas sin volver a preguntar (defaults razonables) están
documentadas en [`docs/decisiones.md`](docs/decisiones.md).
