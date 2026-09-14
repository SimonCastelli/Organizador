import type { Vista } from "@organizador/shared";

/** Único lugar donde se listan las 6 vistas de la app (nav, paleta ⌘K, topbar). */
export const VISTAS: { id: Vista; etiqueta: string }[] = [
  { id: "hoy", etiqueta: "Hoy" },
  { id: "semana", etiqueta: "Semana" },
  { id: "mes", etiqueta: "Mes" },
  { id: "tareas", etiqueta: "Tareas" },
  { id: "facultad", etiqueta: "Facultad" },
  { id: "mails", etiqueta: "Mails" },
];
