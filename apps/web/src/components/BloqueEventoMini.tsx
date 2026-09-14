import { format } from "date-fns";
import type { MouseEvent } from "react";
import type { EventoUnificado } from "@organizador/shared";
import { CODIGO_CORTO_CATEGORIA } from "../lib/categorias";

interface BloqueEventoMiniProps {
  evento: EventoUnificado;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
}

/** Chip compacto para Semana/Mes: código de una letra + hora + título. */
export function BloqueEventoMini({ evento, onClick }: BloqueEventoMiniProps) {
  return (
    <button className="evento-mini" data-categoria={evento.categoria} onClick={onClick} title={evento.titulo}>
      <span className="mono" style={{ fontWeight: 700 }}>
        {CODIGO_CORTO_CATEGORIA[evento.categoria]}·{!evento.todoElDia && format(new Date(evento.inicio), "HH:mm") + " "}
      </span>
      {evento.titulo}
    </button>
  );
}
