import { format } from "date-fns";
import { useState } from "react";
import type { Calendario, Evento } from "../lib/types";

interface FormularioEventoProps {
  calendarios: Calendario[];
  eventoInicial?: Evento;
  fechaSugerida: Date;
  onGuardar: (input: {
    calendarioId: string;
    titulo: string;
    inicio: string;
    fin: string;
    lugar?: string;
    notas?: string;
  }) => void;
  onEliminar?: () => void;
  onCerrar: () => void;
}

function aInputDatetime(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
}

/** Alta/edición de un evento manual. Los calendarios de facultad/lab/tarea
 * también aparecen en el selector: nada impide anotar algo puntual bajo esa
 * categoría aunque lo habitual sea que salga de una Materia o una Tarea. */
export function FormularioEvento({
  calendarios,
  eventoInicial,
  fechaSugerida,
  onGuardar,
  onEliminar,
  onCerrar,
}: FormularioEventoProps) {
  const inicioSugerido = new Date(fechaSugerida);
  inicioSugerido.setHours(inicioSugerido.getHours() + 1, 0, 0, 0);
  const finSugerido = new Date(inicioSugerido.getTime() + 60 * 60 * 1000);

  const [titulo, setTitulo] = useState(eventoInicial?.titulo ?? "");
  const [calendarioId, setCalendarioId] = useState(eventoInicial?.calendarioId ?? "personal");
  const [inicio, setInicio] = useState(
    eventoInicial ? aInputDatetime(eventoInicial.inicio) : aInputDatetime(inicioSugerido.toISOString()),
  );
  const [fin, setFin] = useState(
    eventoInicial ? aInputDatetime(eventoInicial.fin) : aInputDatetime(finSugerido.toISOString()),
  );
  const [lugar, setLugar] = useState(eventoInicial?.lugar ?? "");
  const [notas, setNotas] = useState(eventoInicial?.notas ?? "");

  const enviar = () => {
    if (!titulo.trim()) return;
    onGuardar({
      calendarioId,
      titulo: titulo.trim(),
      inicio: new Date(inicio).toISOString(),
      fin: new Date(fin).toISOString(),
      lugar: lugar.trim() || undefined,
      notas: notas.trim() || undefined,
    });
    onCerrar();
  };

  return (
    <>
      <div className="popover__fila">
        <span className="popover__etiqueta">Título</span>
        <input
          autoFocus
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviar()}
          placeholder="Reunión, entrega, gimnasio..."
        />
      </div>
      <div className="popover__fila">
        <span className="popover__etiqueta">Calendario</span>
        <select value={calendarioId} onChange={(e) => setCalendarioId(e.target.value)}>
          {calendarios.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="popover__fila">
        <span className="popover__etiqueta">Inicio</span>
        <input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} />
      </div>
      <div className="popover__fila">
        <span className="popover__etiqueta">Fin</span>
        <input type="datetime-local" value={fin} onChange={(e) => setFin(e.target.value)} />
      </div>
      <div className="popover__fila">
        <span className="popover__etiqueta">Lugar</span>
        <input value={lugar} onChange={(e) => setLugar(e.target.value)} placeholder="Opcional" />
      </div>
      <div className="popover__fila">
        <span className="popover__etiqueta">Notas</span>
        <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional" />
      </div>
      <div className="popover__acciones">
        {onEliminar && (
          <button
            className="boton-secundario"
            onClick={() => {
              onEliminar();
              onCerrar();
            }}
          >
            Eliminar
          </button>
        )}
        <button className="boton-primario" onClick={enviar}>
          Guardar
        </button>
      </div>
    </>
  );
}
