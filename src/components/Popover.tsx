import { useEffect, type ReactNode } from "react";

interface PopoverProps {
  anchorRect: DOMRect;
  onCerrar: () => void;
  children: ReactNode;
  ancho?: number;
}

/** Popover anclado al elemento que lo abrió — nunca un modal centrado. Se
 * cierra con click afuera o Escape. */
export function Popover({ anchorRect, onCerrar, children, ancho = 300 }: PopoverProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  const margen = 12;
  const maxLeft = window.innerWidth - ancho - margen;
  const left = Math.min(anchorRect.left, Math.max(margen, maxLeft));
  const espacioAbajo = window.innerHeight - anchorRect.bottom;
  const top = espacioAbajo > 260 ? anchorRect.bottom + 8 : Math.max(margen, anchorRect.top - 8 - 260);

  return (
    <div className="popover-fondo" onMouseDown={onCerrar}>
      <div
        className="popover"
        style={{ top, left, width: ancho }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
      >
        {children}
      </div>
    </div>
  );
}
