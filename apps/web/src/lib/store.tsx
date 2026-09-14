import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Calendario,
  ClaseGenerada,
  EstadoSync,
  Evento,
  EventoUnificado,
  Mail,
  Materia,
  OverrideClase,
  Settings,
  Tarea,
} from "@organizador/shared";
import { ErrorNoAutorizado, login, servidorConfigurado, sincronizar } from "./api-cliente";
import {
  contarCola,
  encolarMutacion,
  guardarTodos,
  guardarUno,
  leerCola,
  leerMeta,
  leerTodo,
  escribirMeta,
  quitarDeCola,
  type MutacionCola,
  type NombreStore,
} from "./db-local";
import { generarClases } from "./generar-clases";
import {
  CALENDARIOS_INICIALES,
  EVENTOS_INICIALES,
  MAILS_INICIALES,
  MATERIAS_INICIALES,
  SETTINGS_INICIALES,
  TAREAS_INICIALES,
} from "./seed";

const DURACION_TOAST_MS = 6000;
const INTERVALO_SYNC_MS = 20_000;
const DEBOUNCE_SYNC_MS = 1500;
const CLAVE_CURSOR = "cursorSync";

interface EstadoPersistido {
  eventos: Evento[];
  tareas: Tarea[];
  materias: Materia[];
  calendarios: Calendario[];
  mails: Mail[];
  settings: Settings;
}

function estadoInicial(): EstadoPersistido {
  return {
    eventos: EVENTOS_INICIALES,
    tareas: TAREAS_INICIALES,
    materias: MATERIAS_INICIALES,
    calendarios: CALENDARIOS_INICIALES,
    mails: MAILS_INICIALES,
    settings: SETTINGS_INICIALES,
  };
}

function filtrarActivos<T extends { deletedAt?: string | null }>(items: T[]): T[] {
  return items.filter((item) => !item.deletedAt);
}

/** Primera carga: si ya hay algo en IndexedDB (de una sesión anterior) se
 * usa eso. Si está vacía y hay backend configurado, arranca sin datos — los
 * trae la primera sincronización. Si está vacía y NO hay backend, es la
 * beta standalone de la Fase 0: siembra los datos de ejemplo y los persiste. */
async function cargarEstadoInicial(): Promise<EstadoPersistido> {
  const [eventos, tareas, materias, calendarios, mails, filasSettings] = await Promise.all([
    leerTodo<Evento>("eventos"),
    leerTodo<Tarea>("tareas"),
    leerTodo<Materia>("materias"),
    leerTodo<Calendario>("calendarios"),
    leerTodo<Mail>("mails"),
    leerTodo<Settings & { id: string }>("settings"),
  ]);

  const yaHayDatos =
    eventos.length > 0 || tareas.length > 0 || materias.length > 0 || calendarios.length > 0 || filasSettings.length > 0;

  if (yaHayDatos) {
    const { id: _id, ...settings } = filasSettings[0] ?? { id: "singleton", ...SETTINGS_INICIALES };
    return {
      eventos: filtrarActivos(eventos),
      tareas: filtrarActivos(tareas),
      materias: filtrarActivos(materias),
      calendarios: filtrarActivos(calendarios).length > 0 ? filtrarActivos(calendarios) : CALENDARIOS_INICIALES,
      mails,
      settings,
    };
  }

  if (servidorConfigurado()) {
    return { eventos: [], tareas: [], materias: [], calendarios: CALENDARIOS_INICIALES, mails: [], settings: SETTINGS_INICIALES };
  }

  const semilla = estadoInicial();
  await Promise.all([
    guardarTodos("eventos", semilla.eventos),
    guardarTodos("tareas", semilla.tareas),
    guardarTodos("materias", semilla.materias),
    guardarTodos("calendarios", semilla.calendarios),
    guardarTodos("mails", semilla.mails),
    guardarUno("settings", { id: "singleton", ...semilla.settings }),
  ]);
  return semilla;
}

function generarId(prefijo: string): string {
  return `${prefijo}-${crypto.randomUUID()}`;
}

interface AccionDeshacer {
  mensaje: string;
  deshacer: () => void;
}

/** Contrato entre la UI y la persistencia. Todo componente lee/escribe a
 * través de esto — nunca directo a IndexedDB. Cada mutación: (1) actualiza
 * el estado de React al toque (optimista), (2) la persiste en IndexedDB,
 * (3) encola un registro para /api/sync. Si no hay backend configurado
 * (`VITE_API_URL`), los pasos 3 no tienen efecto visible: la cola se llena
 * pero nunca se drena — la app sigue funcionando 100% local, como en la
 * Fase 0. */
export interface Ctx {
  eventos: Evento[];
  tareas: Tarea[];
  materias: Materia[];
  calendarios: Calendario[];
  mails: Mail[];
  settings: Settings;
  estadoSync: EstadoSync;
  toast: AccionDeshacer | null;

  /** true solo si hay backend configurado y el login (token) todavía no
   * fue validado — la app real sigue usable local mientras tanto. */
  necesitaLogin: boolean;
  iniciarSesion(token: string): Promise<boolean>;

  /** Eventos manuales + clases generadas + tareas-con-fecha, ya combinados y
   * filtrados por calendarios visibles, para pintar en Hoy/Semana/Mes. */
  eventosUnificados(rango: { desde: Date; hasta: Date }): EventoUnificado[];

  crearEvento(input: Pick<Evento, "calendarioId" | "titulo" | "inicio" | "fin"> & Partial<Evento>): Evento;
  actualizarEvento(id: string, patch: Partial<Evento>): void;
  eliminarEvento(id: string): void;

  crearTarea(input: Pick<Tarea, "titulo"> & Partial<Tarea>): Tarea;
  actualizarTarea(id: string, patch: Partial<Tarea>): void;
  toggleTarea(id: string): void;
  eliminarTarea(id: string): void;

  crearMateria(input: Pick<Materia, "nombre" | "horarios" | "desde" | "hasta"> & Partial<Materia>): Materia;
  actualizarMateria(id: string, patch: Partial<Materia>): void;
  eliminarMateria(id: string): void;
  actualizarInstanciaClase(claveInstancia: string, materiaId: string, patch: OverrideClase): void;
  eliminarInstanciaClase(claveInstancia: string, materiaId: string): void;

  toggleCalendario(id: string): void;
  actualizarSettings(patch: Partial<Settings>): void;
  marcarMailLeido(id: string): void;

  cerrarToast(): void;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoPersistido>(estadoInicial);
  const [listo, setListo] = useState(false);
  const [toast, setToast] = useState<AccionDeshacer | null>(null);
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [pendientes, setPendientes] = useState(0);
  const [necesitaLogin, setNecesitaLogin] = useState(false);
  const timerToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sincronizandoRef = useRef(false);
  const settingsRef = useRef(estado.settings);
  settingsRef.current = estado.settings;

  // --- Carga inicial desde IndexedDB ---

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      const [inicial, colaGuardada] = await Promise.all([cargarEstadoInicial(), contarCola()]);
      if (cancelado) return;
      setEstado(inicial);
      setPendientes(colaGuardada);
      setListo(true);
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    const marcarOnline = () => setOnline(true);
    const marcarOffline = () => setOnline(false);
    window.addEventListener("online", marcarOnline);
    window.addEventListener("offline", marcarOffline);
    return () => {
      window.removeEventListener("online", marcarOnline);
      window.removeEventListener("offline", marcarOffline);
    };
  }, []);

  // --- Sync con el servidor (no-op si no hay VITE_API_URL) ---

  const intentarSincronizar = useCallback(async () => {
    if (!servidorConfigurado()) return;
    if (settingsRef.current.simularSinConexion) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (sincronizandoRef.current) return;

    sincronizandoRef.current = true;
    try {
      const cola = await leerCola();
      const cursor = await leerMeta(CLAVE_CURSOR);
      const respuesta = await sincronizar(cursor, cola);

      await Promise.all([
        guardarTodos("eventos", respuesta.cambios.eventos),
        guardarTodos("tareas", respuesta.cambios.tareas),
        guardarTodos("materias", respuesta.cambios.materias),
        guardarTodos("calendarios", respuesta.cambios.calendarios),
        guardarUno("settings", { id: "singleton", ...respuesta.cambios.settings }),
      ]);
      const idsAplicados = cola.map((m) => m.clientId).filter((id): id is number => id !== undefined);
      await quitarDeCola(idsAplicados);
      await escribirMeta(CLAVE_CURSOR, respuesta.servidorTimestamp);

      setEstado((prev) => ({
        eventos: mezclarLista(prev.eventos, respuesta.cambios.eventos),
        tareas: mezclarLista(prev.tareas, respuesta.cambios.tareas),
        materias: mezclarLista(prev.materias, respuesta.cambios.materias),
        calendarios: mezclarLista(prev.calendarios, respuesta.cambios.calendarios),
        mails: prev.mails,
        settings: respuesta.cambios.settings,
      }));
      setPendientes(await contarCola());
      setNecesitaLogin(false);
    } catch (error) {
      if (error instanceof ErrorNoAutorizado) setNecesitaLogin(true);
      // Cualquier otro error (red caída, servidor abajo) se reintenta solo
      // en el próximo tick del intervalo — no hace falta romper la UI.
    } finally {
      sincronizandoRef.current = false;
    }
  }, []);

  const intentarSincronizarRef = useRef(intentarSincronizar);
  intentarSincronizarRef.current = intentarSincronizar;

  useEffect(() => {
    if (!listo || !servidorConfigurado()) return;
    void intentarSincronizarRef.current();
    const id = setInterval(() => void intentarSincronizarRef.current(), INTERVALO_SYNC_MS);
    return () => clearInterval(id);
  }, [listo]);

  const dispararSyncPronto = useCallback(() => {
    if (timerDebounceRef.current) clearTimeout(timerDebounceRef.current);
    timerDebounceRef.current = setTimeout(() => void intentarSincronizarRef.current(), DEBOUNCE_SYNC_MS);
  }, []);

  const iniciarSesion = useCallback<Ctx["iniciarSesion"]>(async (token) => {
    const ok = await login(token);
    if (ok) {
      setNecesitaLogin(false);
      void intentarSincronizarRef.current();
    }
    return ok;
  }, []);

  // --- Persistencia local + cola, comunes a toda mutación ---

  const persistirYEncolar = useCallback(
    (store: NombreStore, entidad: MutacionCola["entidad"], registro: { id: string }, patch: Record<string, unknown>, timestamp: string) => {
      void guardarUno(store, registro);
      void encolarMutacion({ entidad, id: registro.id, patch, timestamp }).then(() => {
        setPendientes((n) => n + 1);
        dispararSyncPronto();
      });
    },
    [dispararSyncPronto],
  );

  const mostrarToast = useCallback((mensaje: string, deshacer: () => void) => {
    if (timerToastRef.current) clearTimeout(timerToastRef.current);
    setToast({ mensaje, deshacer });
    timerToastRef.current = setTimeout(() => setToast(null), DURACION_TOAST_MS);
  }, []);

  const cerrarToast = useCallback(() => {
    if (timerToastRef.current) clearTimeout(timerToastRef.current);
    setToast(null);
  }, []);

  // --- Eventos manuales ---

  const crearEvento = useCallback<Ctx["crearEvento"]>(
    (input) => {
      const ahora = new Date().toISOString();
      const evento: Evento = { id: generarId("evento"), origen: "manual", createdAt: ahora, updatedAt: ahora, ...input };
      setEstado((prev) => ({ ...prev, eventos: [...prev.eventos, evento] }));
      persistirYEncolar("eventos", "evento", evento, { ...evento }, ahora);
      return evento;
    },
    [persistirYEncolar],
  );

  const actualizarEvento = useCallback<Ctx["actualizarEvento"]>(
    (id, patch) => {
      const ahora = new Date().toISOString();
      setEstado((prev) => {
        const actualizado = prev.eventos.find((e) => e.id === id);
        if (!actualizado) return prev;
        const nuevo = { ...actualizado, ...patch, updatedAt: ahora };
        persistirYEncolar("eventos", "evento", nuevo, { ...patch, updatedAt: ahora }, ahora);
        return { ...prev, eventos: prev.eventos.map((e) => (e.id === id ? nuevo : e)) };
      });
    },
    [persistirYEncolar],
  );

  const eliminarEvento = useCallback<Ctx["eliminarEvento"]>(
    (id) => {
      setEstado((prev) => {
        const eliminado = prev.eventos.find((e) => e.id === id);
        if (!eliminado) return prev;
        const ahora = new Date().toISOString();
        const tumba = { ...eliminado, deletedAt: ahora, updatedAt: ahora };
        persistirYEncolar("eventos", "evento", tumba, { deletedAt: ahora }, ahora);

        mostrarToast(`Evento "${eliminado.titulo}" eliminado`, () => {
          const ahoraDeshacer = new Date().toISOString();
          const revivido = { ...eliminado, deletedAt: null, updatedAt: ahoraDeshacer };
          persistirYEncolar("eventos", "evento", revivido, { deletedAt: null }, ahoraDeshacer);
          setEstado((actual) => ({ ...actual, eventos: [...actual.eventos, revivido] }));
        });
        return { ...prev, eventos: prev.eventos.filter((e) => e.id !== id) };
      });
    },
    [mostrarToast, persistirYEncolar],
  );

  // --- Tareas ---

  const crearTarea = useCallback<Ctx["crearTarea"]>(
    (input) => {
      const ahora = new Date().toISOString();
      const tarea: Tarea = { id: generarId("tarea"), hecha: false, fecha: null, createdAt: ahora, updatedAt: ahora, ...input };
      setEstado((prev) => ({ ...prev, tareas: [...prev.tareas, tarea] }));
      persistirYEncolar("tareas", "tarea", tarea, { ...tarea }, ahora);
      return tarea;
    },
    [persistirYEncolar],
  );

  const actualizarTarea = useCallback<Ctx["actualizarTarea"]>(
    (id, patch) => {
      const ahora = new Date().toISOString();
      setEstado((prev) => {
        const previa = prev.tareas.find((t) => t.id === id);
        if (!previa) return prev;
        const nueva = { ...previa, ...patch, updatedAt: ahora };
        persistirYEncolar("tareas", "tarea", nueva, { ...patch, updatedAt: ahora }, ahora);
        return { ...prev, tareas: prev.tareas.map((t) => (t.id === id ? nueva : t)) };
      });
    },
    [persistirYEncolar],
  );

  const toggleTarea = useCallback<Ctx["toggleTarea"]>(
    (id) => {
      const ahora = new Date().toISOString();
      setEstado((prev) => {
        const previa = prev.tareas.find((t) => t.id === id);
        if (!previa) return prev;
        const nueva = { ...previa, hecha: !previa.hecha, updatedAt: ahora };
        persistirYEncolar("tareas", "tarea", nueva, { hecha: nueva.hecha, updatedAt: ahora }, ahora);
        return { ...prev, tareas: prev.tareas.map((t) => (t.id === id ? nueva : t)) };
      });
    },
    [persistirYEncolar],
  );

  const eliminarTarea = useCallback<Ctx["eliminarTarea"]>(
    (id) => {
      setEstado((prev) => {
        const eliminada = prev.tareas.find((t) => t.id === id);
        if (!eliminada) return prev;
        const ahora = new Date().toISOString();
        const tumba = { ...eliminada, deletedAt: ahora, updatedAt: ahora };
        persistirYEncolar("tareas", "tarea", tumba, { deletedAt: ahora }, ahora);

        mostrarToast(`Tarea "${eliminada.titulo}" eliminada`, () => {
          const ahoraDeshacer = new Date().toISOString();
          const revivida = { ...eliminada, deletedAt: null, updatedAt: ahoraDeshacer };
          persistirYEncolar("tareas", "tarea", revivida, { deletedAt: null }, ahoraDeshacer);
          setEstado((actual) => ({ ...actual, tareas: [...actual.tareas, revivida] }));
        });
        return { ...prev, tareas: prev.tareas.filter((t) => t.id !== id) };
      });
    },
    [mostrarToast, persistirYEncolar],
  );

  // --- Materias / clases ---

  const crearMateria = useCallback<Ctx["crearMateria"]>(
    (input) => {
      const ahora = new Date().toISOString();
      const materia: Materia = { id: generarId("materia"), overrides: {}, eliminados: [], createdAt: ahora, updatedAt: ahora, ...input };
      setEstado((prev) => ({ ...prev, materias: [...prev.materias, materia] }));
      persistirYEncolar("materias", "materia", materia, { ...materia }, ahora);
      return materia;
    },
    [persistirYEncolar],
  );

  const actualizarMateria = useCallback<Ctx["actualizarMateria"]>(
    (id, patch) => {
      const ahora = new Date().toISOString();
      setEstado((prev) => {
        const previa = prev.materias.find((m) => m.id === id);
        if (!previa) return prev;
        const nueva = { ...previa, ...patch, updatedAt: ahora };
        persistirYEncolar("materias", "materia", nueva, { ...patch, updatedAt: ahora }, ahora);
        return { ...prev, materias: prev.materias.map((m) => (m.id === id ? nueva : m)) };
      });
    },
    [persistirYEncolar],
  );

  const eliminarMateria = useCallback<Ctx["eliminarMateria"]>(
    (id) => {
      setEstado((prev) => {
        const eliminada = prev.materias.find((m) => m.id === id);
        if (!eliminada) return prev;
        const ahora = new Date().toISOString();
        const tumba = { ...eliminada, deletedAt: ahora, updatedAt: ahora };
        persistirYEncolar("materias", "materia", tumba, { deletedAt: ahora }, ahora);

        mostrarToast(`Materia "${eliminada.nombre}" eliminada`, () => {
          const ahoraDeshacer = new Date().toISOString();
          const revivida = { ...eliminada, deletedAt: null, updatedAt: ahoraDeshacer };
          persistirYEncolar("materias", "materia", revivida, { deletedAt: null }, ahoraDeshacer);
          setEstado((actual) => ({ ...actual, materias: [...actual.materias, revivida] }));
        });
        return { ...prev, materias: prev.materias.filter((m) => m.id !== id) };
      });
    },
    [mostrarToast, persistirYEncolar],
  );

  const actualizarInstanciaClase = useCallback<Ctx["actualizarInstanciaClase"]>(
    (claveInstancia, materiaId, patch) => {
      const ahora = new Date().toISOString();
      setEstado((prev) => {
        const materia = prev.materias.find((m) => m.id === materiaId);
        if (!materia) return prev;
        const overrides = { ...materia.overrides, [claveInstancia]: { ...materia.overrides[claveInstancia], ...patch } };
        const nueva = { ...materia, overrides, updatedAt: ahora };
        persistirYEncolar("materias", "materia", nueva, { overrides, updatedAt: ahora }, ahora);
        return { ...prev, materias: prev.materias.map((m) => (m.id === materiaId ? nueva : m)) };
      });
    },
    [persistirYEncolar],
  );

  const eliminarInstanciaClase = useCallback<Ctx["eliminarInstanciaClase"]>(
    (claveInstancia, materiaId) => {
      const ahora = new Date().toISOString();
      setEstado((prev) => {
        const materia = prev.materias.find((m) => m.id === materiaId);
        if (!materia || materia.eliminados.includes(claveInstancia)) return prev;
        const eliminados = [...materia.eliminados, claveInstancia];
        const nueva = { ...materia, eliminados, updatedAt: ahora };
        persistirYEncolar("materias", "materia", nueva, { eliminados, updatedAt: ahora }, ahora);

        mostrarToast("Clase cancelada", () => {
          const ahoraDeshacer = new Date().toISOString();
          setEstado((actual) => {
            const actual2 = actual.materias.find((m) => m.id === materiaId);
            if (!actual2) return actual;
            const eliminadosSinEsta = actual2.eliminados.filter((c) => c !== claveInstancia);
            const revivida = { ...actual2, eliminados: eliminadosSinEsta, updatedAt: ahoraDeshacer };
            persistirYEncolar("materias", "materia", revivida, { eliminados: eliminadosSinEsta, updatedAt: ahoraDeshacer }, ahoraDeshacer);
            return { ...actual, materias: actual.materias.map((m) => (m.id === materiaId ? revivida : m)) };
          });
        });
        return { ...prev, materias: prev.materias.map((m) => (m.id === materiaId ? nueva : m)) };
      });
    },
    [mostrarToast, persistirYEncolar],
  );

  // --- Calendarios / settings / mails ---

  const toggleCalendario = useCallback<Ctx["toggleCalendario"]>(
    (id) => {
      const ahora = new Date().toISOString();
      setEstado((prev) => {
        const previo = prev.calendarios.find((c) => c.id === id);
        if (!previo) return prev;
        const nuevo = { ...previo, visible: !previo.visible };
        persistirYEncolar("calendarios", "calendario", nuevo, { visible: nuevo.visible }, ahora);
        return { ...prev, calendarios: prev.calendarios.map((c) => (c.id === id ? nuevo : c)) };
      });
    },
    [persistirYEncolar],
  );

  const actualizarSettings = useCallback<Ctx["actualizarSettings"]>(
    (patch) => {
      const ahora = new Date().toISOString();
      setEstado((prev) => {
        const nuevo = { ...prev.settings, ...patch };
        void guardarUno("settings", { id: "singleton", ...nuevo });
        void encolarMutacion({ entidad: "settings", patch, timestamp: ahora }).then(() => {
          setPendientes((n) => n + 1);
          dispararSyncPronto();
        });
        return { ...prev, settings: nuevo };
      });
    },
    [dispararSyncPronto],
  );

  const marcarMailLeido = useCallback<Ctx["marcarMailLeido"]>((id) => {
    setEstado((prev) => {
      const nuevos = prev.mails.map((m) => (m.id === id ? { ...m, leido: true } : m));
      void guardarTodos("mails", nuevos);
      return { ...prev, mails: nuevos };
    });
  }, []);

  // --- Vista unificada de eventos ---

  const eventosUnificados = useCallback<Ctx["eventosUnificados"]>(
    (rango) => {
      const resultado: EventoUnificado[] = [];
      const desdeISO = rango.desde.toISOString();
      const hastaISO = rango.hasta.toISOString();
      const desdeFecha = desdeISO.slice(0, 10);
      const hastaFecha = hastaISO.slice(0, 10);
      const calendarioVisible = (id: string) => estado.calendarios.find((c) => c.id === id)?.visible ?? true;

      for (const evento of estado.eventos) {
        if (!calendarioVisible(evento.calendarioId)) continue;
        if (evento.fin < desdeISO || evento.inicio > hastaISO) continue;
        const calendario = estado.calendarios.find((c) => c.id === evento.calendarioId);
        resultado.push({
          id: evento.id,
          titulo: evento.titulo,
          inicio: evento.inicio,
          fin: evento.fin,
          todoElDia: Boolean(evento.todoElDia),
          categoria: calendario?.categoria ?? "personal",
          lugar: evento.lugar,
          origen: "manual",
          eventoId: evento.id,
        });
      }

      if (calendarioVisible("facultad") || calendarioVisible("lab")) {
        const clases: ClaseGenerada[] = generarClases(estado.materias, rango);
        for (const clase of clases) {
          const categoria = clase.tipo === "laboratorio" ? "lab" : "facultad";
          if (!calendarioVisible(categoria)) continue;
          resultado.push({
            id: `clase:${clase.id}`,
            titulo: clase.titulo,
            inicio: clase.inicio,
            fin: clase.fin,
            todoElDia: false,
            categoria,
            lugar: clase.lugar,
            origen: "clase",
            claveInstancia: clase.id,
            materiaId: clase.materiaId,
          });
        }
      }

      if (calendarioVisible("tarea")) {
        for (const tarea of estado.tareas) {
          if (!tarea.fecha) continue;
          if (tarea.fecha < desdeFecha || tarea.fecha > hastaFecha) continue;
          resultado.push({
            id: `tarea:${tarea.id}`,
            titulo: tarea.titulo,
            inicio: `${tarea.fecha}T00:00:00.000Z`,
            fin: `${tarea.fecha}T23:59:59.999Z`,
            todoElDia: true,
            categoria: "tarea",
            origen: "tarea",
            tareaId: tarea.id,
          });
        }
      }

      return resultado.sort((a, b) => a.inicio.localeCompare(b.inicio));
    },
    [estado.eventos, estado.materias, estado.tareas, estado.calendarios],
  );

  const estadoSync = useMemo<EstadoSync>(
    () => ({ online: estado.settings.simularSinConexion ? false : online, pendientes }),
    [online, estado.settings.simularSinConexion, pendientes],
  );

  const valor = useMemo<Ctx>(
    () => ({
      eventos: estado.eventos,
      tareas: estado.tareas,
      materias: estado.materias,
      calendarios: estado.calendarios,
      mails: estado.mails,
      settings: estado.settings,
      estadoSync,
      toast,
      necesitaLogin,
      iniciarSesion,
      eventosUnificados,
      crearEvento,
      actualizarEvento,
      eliminarEvento,
      crearTarea,
      actualizarTarea,
      toggleTarea,
      eliminarTarea,
      crearMateria,
      actualizarMateria,
      eliminarMateria,
      actualizarInstanciaClase,
      eliminarInstanciaClase,
      toggleCalendario,
      actualizarSettings,
      marcarMailLeido,
      cerrarToast,
    }),
    [
      estado,
      estadoSync,
      toast,
      necesitaLogin,
      iniciarSesion,
      eventosUnificados,
      crearEvento,
      actualizarEvento,
      eliminarEvento,
      crearTarea,
      actualizarTarea,
      toggleTarea,
      eliminarTarea,
      crearMateria,
      actualizarMateria,
      eliminarMateria,
      actualizarInstanciaClase,
      eliminarInstanciaClase,
      toggleCalendario,
      actualizarSettings,
      marcarMailLeido,
      cerrarToast,
    ],
  );

  if (!listo) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)" }}>
        Cargando…
      </div>
    );
  }

  return <StoreContext.Provider value={valor}>{children}</StoreContext.Provider>;
}

/** Mezcla lo que devolvió el servidor en /sync con la lista local: upsert
 * por id, y si trae `deletedAt`, la sacamos de la lista "activa" (el
 * tombstone sigue viviendo en IndexedDB para futuras sincronizaciones). */
function mezclarLista<T extends { id: string; deletedAt?: string | null }>(actual: T[], cambios: T[]): T[] {
  if (cambios.length === 0) return actual;
  const mapa = new Map(actual.map((item) => [item.id, item]));
  for (const item of cambios) {
    if (item.deletedAt) mapa.delete(item.id);
    else mapa.set(item.id, item);
  }
  return Array.from(mapa.values());
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de <StoreProvider>");
  return ctx;
}
