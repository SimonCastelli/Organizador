// Modelo de datos de Organizador. Esta interfaz es el contrato entre la UI
// (store.tsx) y todo lo que la persista atrás: hoy localStorage, en la Fase 1
// IndexedDB + backend. Ningún componente debería depender de cómo se guarda.

/** Las cinco categorías de color que define el mockup. El color real (violeta,
 * azul, verde, rojo, naranja) vive en styles.css — acá solo se identifica la
 * categoría para no acoplar la UI a valores hex. */
export type Categoria = "facultad" | "personal" | "tarea" | "lab" | "mail";

export type OrigenCalendario = "local" | "google";

export interface Calendario {
  id: string;
  nombre: string;
  categoria: Categoria;
  visible: boolean;
  origen: OrigenCalendario;
  /** Fase 2: id de la cuenta de Google a la que pertenece este calendario. */
  cuentaGoogleId?: string;
}

export type OrigenEvento = "manual" | "clase" | "tarea";

export interface Evento {
  id: string;
  calendarioId: string;
  titulo: string;
  /** ISO 8601 con hora. */
  inicio: string;
  /** ISO 8601 con hora. */
  fin: string;
  todoElDia?: boolean;
  lugar?: string;
  notas?: string;
  origen: OrigenEvento;
  /** Si origen === "clase": de qué materia viene (la clase en sí no es una fila,
   * se genera con generarClases; esto solo queda en eventos manuales que el
   * usuario decidió "materializar"). */
  materiaId?: string;
  /** Si origen === "tarea": id de la tarea que representa este evento de
   * todo-el-día (id del evento es siempre `tarea:<tareaId>`). */
  tareaId?: string;
  createdAt: string;
  updatedAt: string;
  /** Tombstone para sync (Fase 1). En la beta local nunca se usa: los
   * borrados se hacen por filtrado directo del arreglo. */
  deletedAt?: string | null;
}

export interface Tarea {
  id: string;
  titulo: string;
  hecha: boolean;
  /** Si tiene fecha, aparece como evento de todo-el-día `tarea:<id>`. */
  fecha?: string | null;
  materiaId?: string;
  notas?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

/** 0 = domingo ... 6 = sábado, igual que Date#getDay(). */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type TipoClase = "teorica" | "practica" | "laboratorio";

export interface HorarioClase {
  dia: DiaSemana;
  /** "HH:mm" */
  horaInicio: string;
  /** "HH:mm" */
  horaFin: string;
  lugar?: string;
  tipo: TipoClase;
}

/** Una edición puntual de una instancia de clase generada, indexada por
 * `claveInstancia`. No borra la instancia (para eso está `eliminados`), solo
 * la corrige (aula cambiada, se adelantó el horario, etc). */
export interface OverrideClase {
  horaInicio?: string;
  horaFin?: string;
  lugar?: string;
  titulo?: string;
}

export interface Materia {
  id: string;
  nombre: string;
  horarios: HorarioClase[];
  /** ISO 8601, fecha (sin hora) de inicio del cuatrimestre. */
  desde: string;
  /** ISO 8601, fecha (sin hora) de fin del cuatrimestre. */
  hasta: string;
  /** Fechas de facultad relevantes para el motor de recordatorios (Fase 3). */
  fechasImportantes?: FechaImportante[];
  /** Claves `claveInstancia` -> edición puntual. */
  overrides: Record<string, OverrideClase>;
  /** Claves `claveInstancia` de instancias borradas (canceladas). */
  eliminados: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type TipoFechaImportante = "parcial" | "entrega" | "final";

export interface FechaImportante {
  id: string;
  tipo: TipoFechaImportante;
  titulo: string;
  /** ISO 8601, fecha. */
  fecha: string;
}

/** Una clase generada a partir de una Materia + HorarioClase para una fecha
 * concreta. Nunca se persiste: se recalcula en cada render a partir de
 * materias + overrides + eliminados. */
export interface ClaseGenerada {
  /** `${materiaId}:${fechaISO}:${indiceHorario}` — clave estable para
   * overrides/eliminados y para el id de evento sintético. */
  id: string;
  materiaId: string;
  materiaNombre: string;
  titulo: string;
  inicio: string;
  fin: string;
  lugar?: string;
  tipo: TipoClase;
}

export type CategoriaMail = "relevante" | "ruido";

/** Mockeado en la beta (Fase 0); en la Fase 2 lo llena el job diario de Gmail. */
export interface Mail {
  id: string;
  cuenta: string;
  de: string;
  asunto: string;
  resumen: string;
  categoria: CategoriaMail;
  recibidoEn: string;
  /** Si el resumen detectó fecha/hora, acá va prellenado para "Crear evento". */
  eventoSugerido?: {
    titulo: string;
    inicio: string;
    fin: string;
  };
  /** URL real del mail en Gmail (Fase 2). En la beta es un mailto/placeholder. */
  urlGmail: string;
  leido: boolean;
}

export interface Settings {
  avisosEventosProximos: boolean;
  minutosAntesAviso: number;
  simularSinConexion: boolean;
  ultimaSincronizacion: string | null;
}

export interface EstadoSync {
  online: boolean;
  pendientes: number;
}

/** Vistas de la app (usadas por la navegación y por el smoke test de Playwright). */
export type Vista = "hoy" | "semana" | "mes" | "tareas" | "facultad" | "mails";

/** Forma común que usan las vistas de calendario (Hoy/Semana/Mes) para pintar
 * eventos manuales, clases generadas y tareas-con-fecha con el mismo
 * componente. Nunca se persiste: se calcula en cada render. */
export interface EventoUnificado {
  id: string;
  titulo: string;
  inicio: string;
  fin: string;
  todoElDia: boolean;
  categoria: Categoria;
  lugar?: string;
  origen: OrigenEvento;
  /** Presente si origen === "manual": id real en `eventos` para editar/borrar. */
  eventoId?: string;
  /** Presente si origen === "clase": clave de la instancia (ver generar-clases). */
  claveInstancia?: string;
  materiaId?: string;
  /** Presente si origen === "tarea". */
  tareaId?: string;
}
