import { randomUUID } from "node:crypto";

export function generarId(prefijo: string): string {
  return `${prefijo}-${randomUUID()}`;
}
