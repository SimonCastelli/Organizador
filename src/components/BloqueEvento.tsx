import { format } from "date-fns";
import type { MouseEvent } from "react";
import type { EventoUnificado } from "../lib/types";

interface BloqueEventoProps {
  evento: EventoUnificado;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
}

/** Fila de evento para la vista Hoy (formato agenda, con hora a la izquierda). */
export function BloqueEvento({ evento, onClick }: BloqueEventoProps) {
  return (
    <button className="evento" data-categoria={evento.categoria} onClick={onClick}>
      <span className="evento__hora mono">{evento.todoElDia ? "Todo el día" : format(new Date(evento.inicio), "HH:mm")}</span>
      <span className="evento__titulo">{evento.titulo}</span>
      {evento.lugar && <span className="evento__lugar mono">{evento.lugar}</span>}
    </button>
  );
}
