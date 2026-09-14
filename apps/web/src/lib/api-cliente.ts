import type { Calendario, Evento, Materia, Settings, Tarea } from "@organizador/shared";
import type { MutacionCola } from "./db-local";

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");

/** Sin `VITE_API_URL` la app funciona 100% local (comportamiento de la
 * Fase 0): no hay servidor con el que sincronizar, así que nunca se muestra
 * la pantalla de login ni se intenta ningún fetch. */
export function servidorConfigurado(): boolean {
  return Boolean(BASE_URL);
}

export interface RespuestaSync {
  servidorTimestamp: string;
  aplicadas: number;
  errores: { entidad: string; id: string; error: string }[];
  cambios: {
    eventos: Evento[];
    tareas: Tarea[];
    materias: Materia[];
    calendarios: Calendario[];
    settings: Settings;
  };
}

export async function login(token: string): Promise<boolean> {
  if (!BASE_URL) return false;
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return res.ok;
}

export async function sincronizar(desde: string | null, mutaciones: MutacionCola[]): Promise<RespuestaSync> {
  if (!BASE_URL) throw new Error("VITE_API_URL no está configurado");
  const res = await fetch(`${BASE_URL}/api/sync`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      desde,
      mutaciones: mutaciones.map(({ clientId: _clientId, ...m }) => m),
    }),
  });
  if (res.status === 401) throw new ErrorNoAutorizado();
  if (!res.ok) throw new Error(`/sync respondió ${res.status}`);
  return res.json();
}

export class ErrorNoAutorizado extends Error {
  constructor() {
    super("No autorizado");
  }
}
