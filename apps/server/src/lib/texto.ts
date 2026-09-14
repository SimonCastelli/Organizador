/** `calendarioId` -> `calendario_id` */
export function camelASnake(campo: string): string {
  return campo.replace(/[A-Z]/g, (letra) => `_${letra.toLowerCase()}`);
}

/** `calendario_id` -> `calendarioId` */
export function snakeACamel(columna: string): string {
  return columna.replace(/_([a-z])/g, (_match, letra: string) => letra.toUpperCase());
}
