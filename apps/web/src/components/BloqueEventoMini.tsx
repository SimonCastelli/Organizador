import { format } from "date-fns";
import type { MouseEvent } from "react";
import type { EventoUnificado } from "@organizador/shared";

interface BloqueEventoMiniProps {
  evento: EventoUnificado;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
}

/** Chip compacto para Semana/Mes: solo hora + título, una línea. */
export function BloqueEventoMini({ evento, onClick }: BloqueEventoMiniProps) {
  return (
    <button className="evento-mini" data-categoria={evento.categoria} onClick={onClick} title={evento.titulo}>
      {!evento.todoElDia && <span className="mono">{format(new Date(evento.inicio), "HH:mm")} </span>}
      {evento.titulo}
    </button>
  );
}
