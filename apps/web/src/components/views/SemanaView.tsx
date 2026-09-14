import { addDays, addWeeks, endOfWeek, format, isSameDay, isToday, startOfWeek, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { useMemo, useState } from "react";
import { BloqueEventoMini } from "../BloqueEventoMini";
import { DetalleEvento } from "../DetalleEvento";
import { FormularioEvento } from "../FormularioEvento";
import { Popover } from "../Popover";
import { useStore } from "../../lib/store";
import { usarPopoverAnclado } from "../../lib/usar-popover";
import type { EventoUnificado } from "@organizador/shared";

export function SemanaView() {
  const store = useStore();
  const [ancla, setAncla] = useState(() => new Date());

  const inicioSemana = useMemo(() => startOfWeek(ancla, { weekStartsOn: 1 }), [ancla]);
  const finSemana = useMemo(() => endOfWeek(ancla, { weekStartsOn: 1 }), [ancla]);
  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(inicioSemana, i)), [inicioSemana]);

  const eventos = useMemo(
    () => store.eventosUnificados({ desde: inicioSemana, hasta: finSemana }),
    [store, inicioSemana, finSemana],
  );

  const popoverNuevo = usarPopoverAnclado<Date>();
  const popoverDetalle = usarPopoverAnclado<EventoUnificado>();
  const [editando, setEditando] = useState(false);

  return (
    <section className="vista">
      <div className="vista__encabezado" data-num="02">
        <h1>
          {format(inicioSemana, "d MMM", { locale: es })} – {format(finSemana, "d MMM", { locale: es })}
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="boton-secundario" onClick={() => setAncla((a) => subWeeks(a, 1))}>
            ← Anterior
          </button>
          <button className="boton-secundario" onClick={() => setAncla(new Date())}>
            Hoy
          </button>
          <button className="boton-secundario" onClick={() => setAncla((a) => addWeeks(a, 1))}>
            Siguiente →
          </button>
        </div>
      </div>

      <div className="grilla-semana">
        {dias.map((dia) => {
          const eventosDelDia = eventos.filter((ev) => isSameDay(new Date(ev.inicio), dia));
          return (
            <div className="columna-dia" key={dia.toISOString()} data-hoy={isToday(dia)}>
              <button
                className="columna-dia__titulo"
                onClick={(e) => popoverNuevo.abrir(e, dia)}
                title="Agregar evento este día"
              >
                {format(dia, "EEE d", { locale: es })}
              </button>
              {eventosDelDia.map((ev) => (
                <BloqueEventoMini
                  key={ev.id}
                  evento={ev}
                  onClick={(e) => {
                    setEditando(false);
                    popoverDetalle.abrir(e, ev);
                  }}
                />
              ))}
            </div>
          );
        })}
      </div>

      {popoverNuevo.abierto && (
        <Popover anchorRect={popoverNuevo.anchorRect!} onCerrar={popoverNuevo.cerrar}>
          <FormularioEvento
            calendarios={store.calendarios}
            fechaSugerida={popoverNuevo.payload ?? ancla}
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
              fechaSugerida={ancla}
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
