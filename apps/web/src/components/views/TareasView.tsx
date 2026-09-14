import { format } from "date-fns";
import { useState } from "react";
import { Popover } from "../Popover";
import { parseNL } from "@organizador/shared";
import { useStore } from "../../lib/store";
import { usarPopoverAnclado } from "../../lib/usar-popover";
import type { Tarea } from "@organizador/shared";

function FormularioTarea({ tarea, onCerrar }: { tarea: Tarea; onCerrar: () => void }) {
  const store = useStore();
  const [fecha, setFecha] = useState(tarea.fecha ?? "");
  const [materiaId, setMateriaId] = useState(tarea.materiaId ?? "");
  const [notas, setNotas] = useState(tarea.notas ?? "");

  const guardar = () => {
    store.actualizarTarea(tarea.id, {
      fecha: fecha || null,
      materiaId: materiaId || undefined,
      notas: notas.trim() || undefined,
    });
    onCerrar();
  };

  return (
    <>
      <div className="popover__fila">
        <span className="popover__etiqueta">Fecha</span>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>
      <div className="popover__fila">
        <span className="popover__etiqueta">Materia</span>
        <select value={materiaId} onChange={(e) => setMateriaId(e.target.value)}>
          <option value="">Sin materia</option>
          {store.materias.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="popover__fila">
        <span className="popover__etiqueta">Notas</span>
        <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
      </div>
      <div className="popover__acciones">
        <button
          className="boton-secundario"
          onClick={() => {
            store.eliminarTarea(tarea.id);
            onCerrar();
          }}
        >
          Eliminar
        </button>
        <button className="boton-primario" onClick={guardar}>
          Guardar
        </button>
      </div>
    </>
  );
}

export function TareasView() {
  const store = useStore();
  const [texto, setTexto] = useState("");
  const popover = usarPopoverAnclado<Tarea>();

  const agregar = () => {
    if (!texto.trim()) return;
    const parseo = parseNL(texto);
    store.crearTarea({
      titulo: parseo.titulo || texto.trim(),
      fecha: parseo.inicio ? format(parseo.inicio, "yyyy-MM-dd") : null,
    });
    setTexto("");
  };

  const pendientes = store.tareas.filter((t) => !t.hecha);
  const hechas = store.tareas.filter((t) => t.hecha);

  return (
    <section className="vista">
      <div className="vista__encabezado">
        <h1>Tareas</h1>
        <span className="vista__nota">{pendientes.length} pendientes</span>
      </div>

      <div className="popover__fila" style={{ marginBottom: 20, maxWidth: 480 }}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && agregar()}
          placeholder="Nueva tarea... (ej: entregar TP viernes)"
        />
      </div>

      <div className="lista-tareas">
        {pendientes.map((t) => (
          <div className="tarea" key={t.id} data-hecha={t.hecha}>
            <button className="tarea__check" data-hecha={t.hecha} onClick={() => store.toggleTarea(t.id)} aria-label="Marcar hecha" />
            <button className="tarea__titulo" style={{ textAlign: "left" }} onClick={(e) => popover.abrir(e, t)}>
              {t.titulo}
            </button>
            {t.fecha && <span className="tarea__fecha mono">{format(new Date(`${t.fecha}T00:00:00`), "d MMM")}</span>}
          </div>
        ))}
      </div>

      {hechas.length > 0 && (
        <>
          <div className="dia-agenda__titulo" style={{ marginTop: 24 }}>
            Hechas
          </div>
          <div className="lista-tareas">
            {hechas.map((t) => (
              <div className="tarea" key={t.id} data-hecha={t.hecha}>
                <button className="tarea__check" data-hecha={t.hecha} onClick={() => store.toggleTarea(t.id)} aria-label="Desmarcar" />
                <button className="tarea__titulo" style={{ textAlign: "left" }} onClick={(e) => popover.abrir(e, t)}>
                  {t.titulo}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {popover.abierto && popover.payload && (
        <Popover anchorRect={popover.anchorRect!} onCerrar={popover.cerrar}>
          <FormularioTarea tarea={popover.payload} onCerrar={popover.cerrar} />
        </Popover>
      )}
    </section>
  );
}
