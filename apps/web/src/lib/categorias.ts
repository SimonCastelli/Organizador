import type { Categoria } from "@organizador/shared";

/** El sistema de diseño actual es monocromo con un solo acento (rojo,
 * reservado para "lab" — la única categoría con tratamiento de color, como
 * una etiqueta de riesgo de manual técnico). Las otras cuatro se
 * distinguen por código, no por color. */
export const CODIGO_CATEGORIA: Record<Categoria, string> = {
  facultad: "FAC",
  personal: "PER",
  tarea: "TAR",
  lab: "LAB",
  mail: "MAIL",
};

/** Versión de una letra para contextos angostos (chips del mes). */
export const CODIGO_CORTO_CATEGORIA: Record<Categoria, string> = {
  facultad: "F",
  personal: "P",
  tarea: "T",
  lab: "L",
  mail: "M",
};
