import { endOfDay, format, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { useMemo, useState } from "react";
import { BloqueEvento } from "../BloqueEvento";
import { DetalleEvento } from "../DetalleEvento";
import { FormularioEvento } from "../FormularioEvento";
import { Popover } from "../Popover";
import { useStore } from "../../lib/store";
import { usarPopoverAnclado } from "../../lib/usar-popover";
import type { EventoUnificado } from "@organizador/shared";

export function HoyView() {
  const store = useStore();
  const hoy = useMemo(() => new Date(), []);
  const rango = useMemo(() => ({ desde: startOfDay(hoy), hasta: endOfDay(hoy) }), [hoy]);
  const eventos = useMemo(() => store.eventosUnificados(rango), [store, rango]);

  const popoverNuevo = usarPopoverAnclado<void>();
  const popoverDetalle = usarPopoverAnclado<EventoUnificado>();
  const [editando, setEditando] = useState(false);

  return (
    <section className="vista">
      <div className="vista__encabezado" data-num="01">
        <div>
          <h1>{format(hoy, "EEEE d 'de' MMMM", { locale: es })}</h1>
        </div>
        <button className="boton-primario" onClick={popoverNuevo.abrir}>
          + Nuevo evento
        </button>
      </div>

      {eventos.length === 0 ? (
        <p className="vista__nota">No tenés nada agendado para hoy.</p>
      ) : (
        <div className="lista-eventos">
          {eventos.map((ev) => (
            <BloqueEvento
              key={ev.id}
              evento={ev}
              onClick={(e) => {
                setEditando(false);
                popoverDetalle.abrir(e, ev);
              }}
            />
          ))}
        </div>
      )}

      {popoverNuevo.abierto && (
        <Popover anchorRect={popoverNuevo.anchorRect!} onCerrar={popoverNuevo.cerrar}>
          <FormularioEvento
            calendarios={store.calendarios}
            fechaSugerida={hoy}
            onGuardar={(input) => store.crearEvento(input)}
            onCerrar={popoverNuevo.cerrar}
          />
        </Popover>
      )}

      {popoverDetalle.abierto && popoverDetalle.payload && (
        <Popover anchorRect={popoverDetalle.anchorRect!} onCerrar={popoverDetalle.cerrar}>
          {editando && popoverDetalle.payload.origen === "manual" ? (
            <FormularioEvento
              calendarios={store.calendarios}
              fechaSugerida={hoy}
              eventoInicial={store.eventos.find((e) => e.id === popoverDetalle.payload!.eventoId)}
              onGuardar={(input) => store.actualizarEvento(popoverDetalle.payload!.eventoId!, input)}
              onEliminar={() => store.eliminarEvento(popoverDetalle.payload!.eventoId!)}
              onCerrar={popoverDetalle.cerrar}
            />
          ) : (
            <DetalleEvento
              evento={popoverDetalle.payload}
              onEditar={() => setEditando(true)}
              onCerrar={popoverDetalle.cerrar}
            />
          )}
        </Popover>
      )}
    </section>
  );
}
