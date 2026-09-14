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
