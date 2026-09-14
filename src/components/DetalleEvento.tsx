import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { useStore } from "../lib/store";
import type { EventoUnificado } from "../lib/types";

interface DetalleEventoProps {
  evento: EventoUnificado;
  onEditar?: () => void;
  onCerrar: () => void;
}

/** Contenido del popover que se abre al hacer click sobre cualquier evento
 * ya combinado (manual, clase de facultad o tarea con fecha). Las acciones
 * disponibles cambian según el origen. */
export function DetalleEvento({ evento, onEditar, onCerrar }: DetalleEventoProps) {
  const store = useStore();
  const [lugarClase, setLugarClase] = useState(evento.lugar ?? "");

  const rango = evento.todoElDia
    ? "Todo el día"
    : `${format(new Date(evento.inicio), "HH:mm")} – ${format(new Date(evento.fin), "HH:mm", { locale: es })}`;

  return (
    <>
      <div className="popover__fila">
        <span className="popover__etiqueta">{format(new Date(evento.inicio), "EEEE d 'de' MMMM", { locale: es })}</span>
        <strong style={{ fontSize: 15 }}>{evento.titulo}</strong>
        <span className="mono" style={{ fontSize: 12, color: "var(--text-dim)" }}>
          {rango}
        </span>
      </div>

      {evento.origen === "manual" && (
        <div className="popover__acciones">
          <button
            className="boton-secundario"
            onClick={() => {
              store.eliminarEvento(evento.eventoId!);
              onCerrar();
            }}
          >
            Eliminar
          </button>
          <button className="boton-primario" onClick={onEditar}>
            Editar
          </button>
        </div>
      )}

      {evento.origen === "clase" && (
        <>
          <div className="popover__fila">
            <span className="popover__etiqueta">Aula / lugar</span>
            <input value={lugarClase} onChange={(e) => setLugarClase(e.target.value)} />
          </div>
          <div className="popover__acciones">
            <button
              className="boton-secundario"
              onClick={() => {
                store.eliminarInstanciaClase(evento.claveInstancia!, evento.materiaId!);
                onCerrar();
              }}
            >
              Cancelar esta clase
            </button>
            <button
              className="boton-primario"
              onClick={() => {
                store.actualizarInstanciaClase(evento.claveInstancia!, evento.materiaId!, { lugar: lugarClase });
                onCerrar();
              }}
            >
              Guardar
            </button>
          </div>
        </>
      )}

      {evento.origen === "tarea" && (
        <div className="popover__acciones">
          <button
            className="boton-secundario"
            onClick={() => {
              store.eliminarTarea(evento.tareaId!);
              onCerrar();
            }}
          >
            Eliminar
          </button>
          <button
            className="boton-primario"
            onClick={() => {
              store.toggleTarea(evento.tareaId!);
              onCerrar();
            }}
          >
            Marcar hecha
          </button>
        </div>
      )}
    </>
  );
}
