import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useMemo, useRef, useState } from "react";
import { parseNL } from "../lib/parse-nl";
import { useStore } from "../lib/store";
import { VISTAS } from "../lib/vistas";
import type { Vista } from "../lib/types";

interface CommandPaletteProps {
  onCerrar: () => void;
  onIrAVista: (vista: Vista) => void;
}

/** ⌘K — paleta sin animación (a diferencia de popovers/toasts). Escribís en
 * lenguaje natural ("informe lab mañana 15hs") y ofrece crear evento o
 * tarea con la fecha/hora ya detectada, además de navegar entre vistas. */
export function CommandPalette({ onCerrar, onIrAVista }: CommandPaletteProps) {
  const store = useStore();
  const [texto, setTexto] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const parseo = useMemo(() => (texto.trim() ? parseNL(texto) : null), [texto]);

  const vistasFiltradas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    if (!q) return [];
    return VISTAS.filter((v) => v.etiqueta.toLowerCase().includes(q));
  }, [texto]);

  const crearEventoDesdeTexto = () => {
    if (!parseo || !parseo.inicio) return;
    const titulo = parseo.titulo || texto.trim();
    const fin = parseo.fin ?? new Date(parseo.inicio.getTime() + 60 * 60 * 1000);
    store.crearEvento({
      calendarioId: "personal",
      titulo,
      inicio: parseo.inicio.toISOString(),
      fin: fin.toISOString(),
      todoElDia: parseo.todoElDia,
    });
    onCerrar();
  };

  const crearTareaDesdeTexto = () => {
    const titulo = parseo?.titulo || texto.trim();
    if (!titulo) return;
    const fecha = parseo?.inicio ? format(parseo.inicio, "yyyy-MM-dd") : null;
    store.crearTarea({ titulo, fecha });
    onCerrar();
  };

  const etiquetaFechaEvento = parseo?.inicio
    ? parseo.todoElDia
      ? format(parseo.inicio, "EEEE d 'de' MMMM", { locale: es })
      : format(parseo.inicio, "EEEE d 'de' MMMM, HH:mm", { locale: es })
    : null;

  return (
    <div className="cmdk-fondo" onMouseDown={onCerrar}>
      <div className="cmdk" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCerrar();
            if (e.key === "Enter" && parseo?.inicio) crearEventoDesdeTexto();
          }}
          placeholder="Escribí para crear o buscar... (ej: informe lab mañana 15hs)"
        />
        <div className="cmdk__lista">
          {texto.trim() === "" && <div className="cmdk__vacio">Empezá a escribir para crear un evento o una tarea.</div>}

          {vistasFiltradas.map((v) => (
            <button
              key={v.id}
              className="cmdk__item"
              onClick={() => {
                onIrAVista(v.id);
                onCerrar();
              }}
            >
              Ir a <strong>{v.etiqueta}</strong>
            </button>
          ))}

          {texto.trim() !== "" && parseo?.inicio && (
            <button className="cmdk__item" onClick={crearEventoDesdeTexto}>
              Crear evento: <strong>{parseo.titulo || texto}</strong>
              <span className="mono" style={{ color: "var(--text-dim)", marginLeft: "auto" }}>
                {etiquetaFechaEvento}
              </span>
            </button>
          )}

          {texto.trim() !== "" && (
            <button className="cmdk__item" onClick={crearTareaDesdeTexto}>
              Crear tarea: <strong>{parseo?.titulo || texto}</strong>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
