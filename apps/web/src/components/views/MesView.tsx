import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { useMemo, useState } from "react";
import { DetalleEvento } from "../DetalleEvento";
import { FormularioEvento } from "../FormularioEvento";
import { Popover } from "../Popover";
import { useStore } from "../../lib/store";
import { usarPopoverAnclado } from "../../lib/usar-popover";
import type { EventoUnificado } from "@organizador/shared";

const MAX_VISIBLES_POR_DIA = 3;

export function MesView() {
  const store = useStore();
  const [ancla, setAncla] = useState(() => new Date());

  const inicioMes = useMemo(() => startOfMonth(ancla), [ancla]);
  const finMes = useMemo(() => endOfMonth(ancla), [ancla]);
  const inicioGrilla = useMemo(() => startOfWeek(inicioMes, { weekStartsOn: 1 }), [inicioMes]);
  const finGrilla = useMemo(() => endOfWeek(finMes, { weekStartsOn: 1 }), [finMes]);
  const dias = useMemo(() => {
    const resultado: Date[] = [];
    let cursor = inicioGrilla;
    while (cursor <= finGrilla) {
      resultado.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return resultado;
  }, [inicioGrilla, finGrilla]);

  const eventos = useMemo(
    () => store.eventosUnificados({ desde: inicioGrilla, hasta: finGrilla }),
    [store, inicioGrilla, finGrilla],
  );

  const popoverDetalle = usarPopoverAnclado<EventoUnificado>();
  const popoverNuevo = usarPopoverAnclado<Date>();
  const [editando, setEditando] = useState(false);

  return (
    <section className="vista">
      <div className="vista__encabezado">
        <h1>{format(ancla, "MMMM yyyy", { locale: es })}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="boton-secundario" onClick={() => setAncla((a) => subMonths(a, 1))}>
            ← Anterior
          </button>
          <button className="boton-secundario" onClick={() => setAncla(new Date())}>
            Hoy
          </button>
          <button className="boton-secundario" onClick={() => setAncla((a) => addMonths(a, 1))}>
            Siguiente →
          </button>
        </div>
      </div>

      <div className="grilla-mes">
        {dias.map((dia) => {
          const eventosDelDia = eventos.filter((ev) => isSameDay(new Date(ev.inicio), dia));
          const visibles = eventosDelDia.slice(0, MAX_VISIBLES_POR_DIA);
          const restantes = eventosDelDia.length - visibles.length;
          return (
            <div
              className="celda-mes"
              key={dia.toISOString()}
              data-fuera-de-mes={!isSameMonth(dia, ancla)}
              data-hoy={isToday(dia)}
            >
              <button className="celda-mes__numero" onClick={(e) => popoverNuevo.abrir(e, dia)}>
                {format(dia, "d")}
              </button>
              {visibles.map((ev) => (
                <button
                  key={ev.id}
                  className="evento-mini"
                  data-categoria={ev.categoria}
                  title={ev.titulo}
                  onClick={(e) => {
                    setEditando(false);
                    popoverDetalle.abrir(e, ev);
                  }}
                >
                  {ev.titulo}
                </button>
              ))}
              {restantes > 0 && <span className="vista__nota">+{restantes} más</span>}
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
