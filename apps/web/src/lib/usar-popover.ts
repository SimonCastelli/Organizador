import { useCallback, useState, type MouseEvent } from "react";

/** Estado de un popover anclado al elemento que lo abrió (nunca un modal
 * centrado). `payload` lleva el dato sobre el que se abrió (el evento que se
 * está editando, por ejemplo). */
export function usarPopoverAnclado<T = void>() {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [payload, setPayload] = useState<T | null>(null);

  const abrir = useCallback((evento: MouseEvent<HTMLElement>, data?: T) => {
    setAnchorRect(evento.currentTarget.getBoundingClientRect());
    setPayload(data ?? null);
  }, []);

  const cerrar = useCallback(() => {
    setAnchorRect(null);
    setPayload(null);
  }, []);

  return { anchorRect, payload, abrir, cerrar, abierto: anchorRect !== null };
}
