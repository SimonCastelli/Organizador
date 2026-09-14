# Organizador

Calendario + tareas personal para Simón (estudiante de Ingeniería en
Computación, FIE). Usuario único, todo en español rioplatense.

Esta es la **Fase 0**: la beta del front, 100% cliente, sin backend. Corre
en Vite + React 19 + TypeScript + date-fns, persiste en `localStorage` y no
usa ninguna librería de componentes ni Tailwind — todo el diseño está en
`src/styles.css`.

## Cómo correrlo

Requiere Node 22+.

```bash
npm install
npm run dev       # http://localhost:5173
```

Otros comandos:

```bash
npm run build      # tsc --noEmit + build de producción a dist/
npm run preview    # sirve dist/ para probar el build
npm test           # vitest (parse-nl, generación de clases)
npm run test:e2e   # playwright (smoke de las seis vistas)
```

## Arquitectura

- **`src/lib/types.ts`** — modelo de datos: `Evento`, `Tarea`, `Materia`,
  `ClaseGenerada`, `Mail`, `Settings`. `EventoUnificado` es la forma común
  que usan las vistas de calendario para pintar eventos manuales, clases de
  facultad y tareas-con-fecha con el mismo componente.
- **`src/lib/store.tsx`** — `StoreProvider` + `useStore()`. Es la interfaz
  `Ctx`: **el contrato entre la UI y la persistencia**. Ningún componente
  toca `localStorage` directamente. La Fase 1 cambia qué hay detrás de este
  contrato (IndexedDB + cola de sync + servidor) sin tocar un solo
  componente.
- **`src/lib/generar-clases.ts`** — las clases de facultad no son filas: se
  generan en cada render a partir de `Materia.horarios` + `desde`/`hasta`.
  `overrides` edita una instancia puntual (cambio de aula, horario
  corrido); `eliminados` la cancela. Ambos indexan por
  `claveInstancia(materiaId, fechaISO, índiceHorario)`.
- **`src/lib/parse-nl.ts`** — parser de lenguaje natural en español
  rioplatense ("mañana 15hs", "el viernes 10:30", "en 3 días") usado por la
  paleta ⌘K y (en la Fase 2) por la detección de fecha/hora en mails.
- **`src/lib/seed.ts`** — datos de arranque para que la app no nazca vacía.
  Se reemplazan por completo en cuanto haya backend.

## Vistas

Hoy · Semana · Mes · Tareas · Facultad · Mails — navegación por la barra
lateral (o `⌘K` / `Ctrl+K` para crear/buscar). Los "Ajustes" (avisos,
minutos de aviso, simular sin conexión) viven en un popover del topbar en
vez de ser una séptima vista.

## Diseño

Geist queda descartado: la identidad visual toma como referencia un
portfolio personal ya aprobado — **Newsreader** (serif, texto) +
**JetBrains Mono** (mono, datos/etiquetas/nav) sobre una base navy oscura
con grid de fondo sutil. El color se reserva para barras de 3px, puntos de
calendario y chips: facultad violeta, personal azul, tareas verde, lab
rojo, mails naranja (azul y naranja/ámbar son los mismos acentos que ya
usaba el portfolio de referencia).

Reglas de interacción: motion < 300ms con ease-out, popovers siempre
anclados al elemento que los abre (nunca modales centrados), la paleta ⌘K
sin animación, y ningún flujo destructivo pide confirmación — borra y
ofrece **deshacer por 6 segundos** en un toast.

## Deploy

GitHub Pages vía Actions (`.github/workflows/pages.yml`): cada push a
`main` corre tests, build con `GITHUB_PAGES=1` (así `vite.config.ts` pone
`base: "/Organizador/"`) y publica `dist/`.

## Estado del proyecto

- [x] **Fase 0** — beta del front (este README).
- [ ] **Fase 1** — backend Node/Express + SQLite, sync offline-first
      (IndexedDB + cola de mutaciones + LWW), Docker Compose.
- [ ] **Fase 2** — Google Calendar + Gmail (multi-cuenta).
- [ ] **Fase 3** — Web Push + motor de tareas automáticas.
- [ ] **Fase 4** — PWA instalable, TWA en Android, wrapper Tauri en Linux.

Decisiones tomadas sin volver a preguntar (defaults razonables) están
documentadas en [`docs/decisiones.md`](docs/decisiones.md).
