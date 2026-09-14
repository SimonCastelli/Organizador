import { addDays, formatISO, startOfDay } from "date-fns";
import type { Calendario, Mail, Materia, Settings, Tarea, Evento } from "@organizador/shared";

// Datos de arranque para que la app no nazca vacía. Son solo para la beta:
// en la Fase 1 esto se reemplaza por lo que traiga el servidor.

const hoy = startOfDay(new Date());
const fechaISO = (offsetDias: number) => formatISO(addDays(hoy, offsetDias), { representation: "date" });
const ahoraISO = () => new Date().toISOString();

export const CALENDARIOS_INICIALES: Calendario[] = [
  { id: "facultad", nombre: "Facultad", categoria: "facultad", visible: true, origen: "local" },
  { id: "personal", nombre: "Personal", categoria: "personal", visible: true, origen: "local" },
  { id: "lab", nombre: "Laboratorio", categoria: "lab", visible: true, origen: "local" },
  { id: "tarea", nombre: "Tareas", categoria: "tarea", visible: true, origen: "local" },
  { id: "mail", nombre: "Mails", categoria: "mail", visible: true, origen: "local" },
];

export const MATERIAS_INICIALES: Materia[] = [
  {
    id: "materia-analisis",
    nombre: "Análisis de Sistemas",
    horarios: [
      { dia: 1, horaInicio: "14:00", horaFin: "17:00", lugar: "Aula 302", tipo: "teorica" },
      { dia: 3, horaInicio: "08:00", horaFin: "10:00", lugar: "Aula 302", tipo: "practica" },
    ],
    desde: fechaISO(-14),
    hasta: fechaISO(120),
    fechasImportantes: [
      { id: "fi-1", tipo: "parcial", titulo: "Primer parcial", fecha: fechaISO(21) },
    ],
    overrides: {},
    eliminados: [],
    createdAt: ahoraISO(),
    updatedAt: ahoraISO(),
  },
  {
    id: "materia-bda",
    nombre: "Bases de Datos Aplicadas",
    horarios: [
      { dia: 2, horaInicio: "18:00", horaFin: "20:00", lugar: "Aula 105", tipo: "teorica" },
      { dia: 5, horaInicio: "14:00", horaFin: "18:00", lugar: "Lab 2", tipo: "laboratorio" },
    ],
    desde: fechaISO(-14),
    hasta: fechaISO(120),
    fechasImportantes: [
      { id: "fi-2", tipo: "entrega", titulo: "Entrega TP stock", fecha: fechaISO(8) },
    ],
    overrides: {},
    eliminados: [],
    createdAt: ahoraISO(),
    updatedAt: ahoraISO(),
  },
];

export const EVENTOS_INICIALES: Evento[] = [
  {
    id: "evento-demo-1",
    calendarioId: "personal",
    titulo: "Gimnasio",
    inicio: `${fechaISO(0)}T19:00:00.000Z`,
    fin: `${fechaISO(0)}T20:00:00.000Z`,
    origen: "manual",
    createdAt: ahoraISO(),
    updatedAt: ahoraISO(),
  },
];

export const TAREAS_INICIALES: Tarea[] = [
  {
    id: "tarea-demo-1",
    titulo: "Preparar informe de laboratorio",
    hecha: false,
    fecha: fechaISO(2),
    materiaId: "materia-bda",
    createdAt: ahoraISO(),
    updatedAt: ahoraISO(),
  },
  {
    id: "tarea-demo-2",
    titulo: "Repasar unidad 3 para el parcial",
    hecha: false,
    fecha: null,
    materiaId: "materia-analisis",
    createdAt: ahoraISO(),
    updatedAt: ahoraISO(),
  },
];

export const MAILS_INICIALES: Mail[] = [
  {
    id: "mail-demo-1",
    cuenta: "personal",
    de: "Facultad de Ingeniería del Ejército",
    asunto: "Cambio de aula — Bases de Datos Aplicadas",
    resumen: "La clase del viernes se traslada al Lab 2 por mantenimiento del Lab 1.",
    categoria: "relevante",
    recibidoEn: new Date().toISOString(),
    eventoSugerido: {
      titulo: "Bases de Datos Aplicadas (Lab 2)",
      inicio: `${fechaISO(5)}T14:00:00.000Z`,
      fin: `${fechaISO(5)}T18:00:00.000Z`,
    },
    urlGmail: "https://mail.google.com/mail/u/0/#inbox",
    leido: false,
  },
  {
    id: "mail-demo-2",
    cuenta: "personal",
    de: "No Reply — Newsletter Semanal",
    asunto: "Las 10 noticias de tecnología de esta semana",
    resumen: "Newsletter automático, sin acción requerida.",
    categoria: "ruido",
    recibidoEn: new Date().toISOString(),
    urlGmail: "https://mail.google.com/mail/u/0/#inbox",
    leido: true,
  },
];

export const SETTINGS_INICIALES: Settings = {
  avisosEventosProximos: true,
  minutosAntesAviso: 10,
  simularSinConexion: false,
  ultimaSincronizacion: null,
};
