# Decisiones

Registro de decisiones tomadas con un default razonable en vez de
preguntar, como pide el prompt original. Orden cronológico.

## Fase 0

**El repo estaba vacío.** El prompt asumía una beta ya existente en `main`
(`src/lib/store.tsx`, `types.ts`, `styles.css`, deploy a Pages). Al conectar
el repo `SimonCastelli/Organizador` no había ni un commit. Se lo consultó al
usuario, que confirmó: construir esa Fase 0 desde cero, siguiendo al pie de
la letra la estructura que el prompt describía, y recién después arrancar
la Fase 1. Todo lo que sigue en esta sección son decisiones tomadas durante
esa reconstrucción.

**Identidad visual: portfolio del usuario en vez de "Geist genérico".**
Antes de escribir estilos, el usuario compartió su portfolio personal como
referencia estética (Newsreader + JetBrains Mono, navy oscuro `#10151f` /
`#161d2b`, ámbar `#dcaa4a` + azul `#4d6d94`, grid de fondo sutil). Se
adoptó esa paleta como base del sistema en vez de una identidad "Geist"
inventada: **azul** y **ámbar/naranja** son los mismos acentos que ya usaba
el portfolio, reutilizados para las categorías *personal* y *mails*; se
agregaron violeta (*facultad*), verde (*tareas*) y rojo (*lab*) para
completar las cinco categorías que pedía el mockup original. El resto de la
UI sigue siendo monocroma navy — el color solo aparece en barras de 3px,
puntos y chips, como pedía el prompt.

**Seis vistas: Hoy, Semana, Mes, Tareas, Facultad, Mails.** El prompt
menciona "las seis vistas" para el smoke de Playwright sin nombrarlas. Se
eligieron estas seis porque cubren agenda diaria/semanal/mensual + las tres
secciones de dominio (tareas, materias/clases, mails).

**Ajustes vive en un popover del topbar, no como séptima vista.** Los
toggles de "Avisos de eventos próximos", minutos de aviso y "Simular sin
conexión" no encajaban en ninguna de las seis vistas ni ameritaban una
séptima. Un popover anclado al botón "Ajustes" respeta la regla de "sin
modales" y no infla la navegación.

**Calendarios = las cinco categorías, no calendarios arbitrarios.** En vez
de modelar "calendarios" como una entidad libre, la lista togglable del
sidebar tiene exactamente las cinco categorías del diseño (facultad,
personal, lab, tareas, mails), cada una con su color fijo. Los calendarios
reales de Google (Fase 2) se agregan a esa misma lista con
`origen: "google"` sin romper el modelo — no hizo falta generalizar de más
todavía.

**Materias con horarios múltiples, overrides/eliminados por clave
compuesta.** Una `Materia` puede tener más de un `HorarioClase` semanal
(teórica lunes, práctica miércoles, laboratorio viernes...). La clave de
cada instancia generada es `materiaId:fechaISO:índiceHorario`
(`claveInstancia` en `generar-clases.ts`), usada tanto para `overrides`
(editar aula/horario de una clase puntual) como para `eliminados`
(cancelarla). Las clases nunca se persisten como filas: se recalculan en
cada render.

**`parse-nl` por reglas, sin librería de NLP.** Cubre "hoy" / "mañana" /
"pasado mañana" / "en N días" / día de la semana (con o sin "el próximo") +
hora en formato "a las HH", "HHhs", "HH:mm", "N y media", "mediodía",
"medianoche". Es determinístico y send testeable con Vitest; alcanza para
el ⌘K y para lo que el job de Gmail de la Fase 2 necesita detectar.

**Undo por toast, ventana fija de 6 segundos.** Ningún flujo destructivo
(borrar evento/tarea/materia, cancelar una clase) pide confirmación: borra
al toque y ofrece "Deshacer" en un toast que se cierra solo a los 6s. Es
más rápido de descartar que un modal y respeta la regla de diseño del
prompt.

**La beta arranca con datos de ejemplo (`seed.ts`), no vacía.** Ayuda a
probar la app y al smoke de Playwright sin depender de un flujo de alta
manual. Se descarta por completo apenas haya backend (Fase 1): ahí el
estado inicial lo define lo que el servidor devuelva.

**Estructura de carpetas: todo en la raíz para la Fase 0.** El prompt
describe la beta como una app plana en la raíz del repo
(`src/lib/store.tsx`, no `apps/web/src/...`) y recién pide el monorepo
(`apps/web`, `apps/server`, `packages/shared`) como parte de la Fase 1. Se
mantuvo la Fase 0 fiel a esa descripción para no reestructurar código dos
veces; la migración a monorepo se hace al agregar el backend.

**Ramas: fusión directa a `main` sin PR.** El usuario lo pidió
explícitamente después de ver que, al estar el repo vacío al arrancar,
GitHub había creado `main` apuntando al mismo commit que la rama de
trabajo. Desde la Fase 1 en adelante cada fase se fusiona a `main` al
cerrarse, sin pull request de por medio.

## Fase 1

**El monorepo se armó en un commit separado, antes de tocar el backend.**
Mover `apps/web` tal cual y extraer `packages/shared` no cambia
comportamiento; mezclarlo con el diff del servidor hubiera hecho más
difícil revisar cada cosa por separado.

**LWW por campo, no por fila — con una columna oculta `campo_ts`.** El
prompt pide explícitamente "last-write-wins por campo con `updatedAt`".
Como el modelo del cliente (`Evento`, `Tarea`, `Materia`) solo tiene un
`updatedAt` por registro entero, la granularidad por campo se resuelve en
el servidor: cada tabla SQLite tiene una columna `campo_ts` (JSON
`{columna: timestampISO}`) que recuerda cuándo se escribió *cada columna*
por última vez. Una mutación entrante solo pisa una columna si su
timestamp es más nuevo que el que ya tenía esa columna puntual — así dos
dispositivos que editaron campos distintos del mismo registro offline no
se pisan al sincronizar. Ver `apps/server/src/lib/lww.ts` y los tests de
conflictos en `apps/server/test/api.test.ts`.

**Los tombstones son una columna más, sujeta a la misma regla de LWW.**
`deletedAt` no tiene tratamiento especial: es otro campo en `campo_ts`. Una
edición vieja que llega tarde y no menciona `deletedAt` nunca resucita un
registro que se borró después con un timestamp más nuevo.

**`overrides`/`eliminados` de una Materia se sincronizan como un campo
atómico (el blob JSON entero), no por clave interna.** Simplificación
consciente: dos dispositivos que cancelan/editan *instancias de clase
distintas* de la misma materia mientras ambos están offline pueden
pisarse el blob completo al reconciliar (gana el que tenga el timestamp de
esa escritura más nuevo). Para el caso de uso real —una persona, un
usuario— el riesgo es bajo; que quede explícito si en algún momento se
necesita LWW dentro del propio JSON.

**`packages/shared` es TypeScript fuente, sin paso de build propio.** El
`package.json` del paquete apunta `main`/`types`/`exports` directo a
`src/index.ts`. Tanto Vite (para `apps/web`) como `tsx` (para
`apps/server`) transpilan `.ts` al vuelo sin importar de dónde vengan (ni
siquiera si están en `node_modules` vía symlink de workspace), así que no
hace falta compilar `shared` aparte ni mantener sincronizado un `dist/`.

**El servidor corre con `tsx`, no con un build de `tsc` a JS.** Mismo
razonamiento: para un servidor de un solo usuario en un VPS chico, evitar
un paso de compilación separado (y su propio `dist/`, su propio
`tsconfig` de build, sus propios `outDir`) simplifica el Dockerfile y el
día a día sin ningún costo real de performance.

**Auth: el servidor rechaza todo si falta `AUTH_TOKEN`, en vez de dejarlo
abierto por default.** Falla cerrado — más seguro para un usuario único
que no va a tener un segundo ojo revisando la config del `.env` en
producción.

**Calendarios: se agregó una tabla propia, aunque el prompt solo pedía
"eventos, tareas, materias, settings" como mínimo de la API.** El front ya
modela `Calendario` como entidad (la lista togglable del sidebar) y la
Fase 2 va a necesitar agregar ahí los calendarios de Google — mejor tener
el tombstone/LWW resuelto desde ahora que parchearlo después.

**Sync push+pull en un solo `POST /sync`, no dos endpoints.** El cliente
manda `desde` (su cursor) y `mutaciones` (lo que encoló) en el mismo
request; el servidor aplica las mutaciones y devuelve todo lo cambiado
desde ese cursor, incluyendo lo que el cliente mismo acaba de escribir (ya
reconciliado con lo que haya llegado de otro dispositivo). Un solo
round-trip en vez de dos simplifica el cliente y evita una ventana rara
entre "subí mis cambios" y "bajé los cambios ajenos".

**Cliente: sync inmediata (debounced a 1.5s) + reintento fijo cada 20s.**
No se implementó backoff exponencial: para una app de un usuario con un
puñado de dispositivos, un intervalo fijo es más simple y suficiente. Si
en algún momento el servidor empieza a devolver errores en cadena (no
solo caídas de red), vale la pena revisar esto.

**Pantalla de login como página completa, no modal.** Solo aparece si hay
`VITE_API_URL` configurado y el servidor devuelve 401 — la regla de "sin
modales ni confirmaciones" del diseño original se mantiene: es contenido
de página, no un diálogo superpuesto.

**Sin `VITE_API_URL`, la app nunca sabe que existe un backend.** Todo el
código de sync (`api-cliente.ts`) chequea `servidorConfigurado()` antes de
hacer un solo fetch. Esto mantiene la Fase 0 (beta standalone, GitHub
Pages sin servidor) funcionando exactamente igual que antes.
