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
import { generarClases } from "./generar-clases";
import {
  CALENDARIOS_INICIALES,
  EVENTOS_INICIALES,
  MAILS_INICIALES,
  MATERIAS_INICIALES,
  SETTINGS_INICIALES,
  TAREAS_INICIALES,
} from "./seed";
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

const CLAVE_ALMACENAMIENTO = "agenda:v2";
const DURACION_TOAST_MS = 6000;

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

function cargarEstado(): EstadoPersistido {
  if (typeof localStorage === "undefined") return estadoInicial();
  try {
    const crudo = localStorage.getItem(CLAVE_ALMACENAMIENTO);
    if (!crudo) return estadoInicial();
    return JSON.parse(crudo) as EstadoPersistido;
  } catch {
    return estadoInicial();
  }
}

function generarId(prefijo: string): string {
  return `${prefijo}-${crypto.randomUUID()}`;
}

interface AccionDeshacer {
  mensaje: string;
  deshacer: () => void;
}

/** Contrato entre la UI y la persistencia. Todo componente lee/escribe a
 * través de esto — nunca directo a localStorage/IndexedDB. La Fase 1 cambia
 * qué hay detrás de esta interfaz (IndexedDB + cola de sync + servidor) sin
 * que ningún componente tenga que cambiar. */
export interface Ctx {
  eventos: Evento[];
  tareas: Tarea[];
  materias: Materia[];
  calendarios: Calendario[];
  mails: Mail[];
  settings: Settings;
  estadoSync: EstadoSync;
  toast: AccionDeshacer | null;

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
  const [estado, setEstado] = useState<EstadoPersistido>(cargarEstado);
  const [toast, setToast] = useState<AccionDeshacer | null>(null);
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const timerToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(estado));
  }, [estado]);

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

  const crearEvento = useCallback<Ctx["crearEvento"]>((input) => {
    const ahora = new Date().toISOString();
    const evento: Evento = {
      id: generarId("evento"),
      origen: "manual",
      createdAt: ahora,
      updatedAt: ahora,
      ...input,
    };
    setEstado((prev) => ({ ...prev, eventos: [...prev.eventos, evento] }));
    return evento;
  }, []);

  const actualizarEvento = useCallback<Ctx["actualizarEvento"]>((id, patch) => {
    const ahora = new Date().toISOString();
    setEstado((prev) => ({
      ...prev,
      eventos: prev.eventos.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: ahora } : e)),
    }));
  }, []);

  const eliminarEvento = useCallback<Ctx["eliminarEvento"]>(
    (id) => {
      setEstado((prev) => {
        const eliminado = prev.eventos.find((e) => e.id === id);
        if (!eliminado) return prev;
        mostrarToast(`Evento "${eliminado.titulo}" eliminado`, () => {
          setEstado((actual) => ({ ...actual, eventos: [...actual.eventos, eliminado] }));
        });
        return { ...prev, eventos: prev.eventos.filter((e) => e.id !== id) };
      });
    },
    [mostrarToast],
  );

  // --- Tareas ---

  const crearTarea = useCallback<Ctx["crearTarea"]>((input) => {
    const ahora = new Date().toISOString();
    const tarea: Tarea = {
      id: generarId("tarea"),
      hecha: false,
      fecha: null,
      createdAt: ahora,
      updatedAt: ahora,
      ...input,
    };
    setEstado((prev) => ({ ...prev, tareas: [...prev.tareas, tarea] }));
    return tarea;
  }, []);

  const actualizarTarea = useCallback<Ctx["actualizarTarea"]>((id, patch) => {
    const ahora = new Date().toISOString();
    setEstado((prev) => ({
      ...prev,
      tareas: prev.tareas.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: ahora } : t)),
    }));
  }, []);

  const toggleTarea = useCallback<Ctx["toggleTarea"]>((id) => {
    const ahora = new Date().toISOString();
    setEstado((prev) => ({
      ...prev,
      tareas: prev.tareas.map((t) => (t.id === id ? { ...t, hecha: !t.hecha, updatedAt: ahora } : t)),
    }));
  }, []);

  const eliminarTarea = useCallback<Ctx["eliminarTarea"]>(
    (id) => {
      setEstado((prev) => {
        const eliminada = prev.tareas.find((t) => t.id === id);
        if (!eliminada) return prev;
        mostrarToast(`Tarea "${eliminada.titulo}" eliminada`, () => {
          setEstado((actual) => ({ ...actual, tareas: [...actual.tareas, eliminada] }));
        });
        return { ...prev, tareas: prev.tareas.filter((t) => t.id !== id) };
      });
    },
    [mostrarToast],
  );

  // --- Materias / clases ---

  const crearMateria = useCallback<Ctx["crearMateria"]>((input) => {
    const ahora = new Date().toISOString();
    const materia: Materia = {
      id: generarId("materia"),
      overrides: {},
      eliminados: [],
      createdAt: ahora,
      updatedAt: ahora,
      ...input,
    };
    setEstado((prev) => ({ ...prev, materias: [...prev.materias, materia] }));
    return materia;
  }, []);

  const actualizarMateria = useCallback<Ctx["actualizarMateria"]>((id, patch) => {
    const ahora = new Date().toISOString();
    setEstado((prev) => ({
      ...prev,
      materias: prev.materias.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: ahora } : m)),
    }));
  }, []);

  const eliminarMateria = useCallback<Ctx["eliminarMateria"]>(
    (id) => {
      setEstado((prev) => {
        const eliminada = prev.materias.find((m) => m.id === id);
        if (!eliminada) return prev;
        mostrarToast(`Materia "${eliminada.nombre}" eliminada`, () => {
          setEstado((actual) => ({ ...actual, materias: [...actual.materias, eliminada] }));
        });
        return { ...prev, materias: prev.materias.filter((m) => m.id !== id) };
      });
    },
    [mostrarToast],
  );

  const actualizarInstanciaClase = useCallback<Ctx["actualizarInstanciaClase"]>((claveInstancia, materiaId, patch) => {
    const ahora = new Date().toISOString();
    setEstado((prev) => ({
      ...prev,
      materias: prev.materias.map((m) =>
        m.id === materiaId
          ? {
              ...m,
              overrides: { ...m.overrides, [claveInstancia]: { ...m.overrides[claveInstancia], ...patch } },
              updatedAt: ahora,
            }
          : m,
      ),
    }));
  }, []);

  const eliminarInstanciaClase = useCallback<Ctx["eliminarInstanciaClase"]>(
    (claveInstancia, materiaId) => {
      const ahora = new Date().toISOString();
      setEstado((prev) => {
        const materia = prev.materias.find((m) => m.id === materiaId);
        if (!materia || materia.eliminados.includes(claveInstancia)) return prev;
        mostrarToast("Clase cancelada", () => {
          setEstado((actual) => ({
            ...actual,
            materias: actual.materias.map((m) =>
              m.id === materiaId ? { ...m, eliminados: m.eliminados.filter((c) => c !== claveInstancia) } : m,
            ),
          }));
        });
        return {
          ...prev,
          materias: prev.materias.map((m) =>
            m.id === materiaId ? { ...m, eliminados: [...m.eliminados, claveInstancia], updatedAt: ahora } : m,
          ),
        };
      });
    },
    [mostrarToast],
  );

  // --- Calendarios / settings / mails ---

  const toggleCalendario = useCallback<Ctx["toggleCalendario"]>((id) => {
    setEstado((prev) => ({
      ...prev,
      calendarios: prev.calendarios.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)),
    }));
  }, []);

  const actualizarSettings = useCallback<Ctx["actualizarSettings"]>((patch) => {
    setEstado((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const marcarMailLeido = useCallback<Ctx["marcarMailLeido"]>((id) => {
    setEstado((prev) => ({
      ...prev,
      mails: prev.mails.map((m) => (m.id === id ? { ...m, leido: true } : m)),
    }));
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
    () => ({ online: estado.settings.simularSinConexion ? false : online, pendientes: 0 }),
    [online, estado.settings.simularSinConexion],
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

  return <StoreContext.Provider value={valor}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de <StoreProvider>");
  return ctx;
}
