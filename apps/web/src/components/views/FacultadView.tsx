import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { Popover } from "../Popover";
import { useStore } from "../../lib/store";
import { usarPopoverAnclado } from "../../lib/usar-popover";
import type { DiaSemana, HorarioClase, Materia, TipoClase } from "@organizador/shared";

const NOMBRES_DIA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function horarioVacio(): HorarioClase {
  return { dia: 1, horaInicio: "08:00", horaFin: "10:00", lugar: "", tipo: "teorica" };
}

function FormularioMateria({ materiaInicial, onCerrar }: { materiaInicial?: Materia; onCerrar: () => void }) {
  const store = useStore();
  const [nombre, setNombre] = useState(materiaInicial?.nombre ?? "");
  const [desde, setDesde] = useState(materiaInicial?.desde ?? format(new Date(), "yyyy-MM-dd"));
  const [hasta, setHasta] = useState(materiaInicial?.hasta ?? format(new Date(), "yyyy-MM-dd"));
  const [horarios, setHorarios] = useState<HorarioClase[]>(materiaInicial?.horarios ?? [horarioVacio()]);

  const actualizarHorario = (i: number, patch: Partial<HorarioClase>) => {
    setHorarios((prev) => prev.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  };

  const guardar = () => {
    if (!nombre.trim()) return;
    if (materiaInicial) {
      store.actualizarMateria(materiaInicial.id, { nombre: nombre.trim(), desde, hasta, horarios });
    } else {
      store.crearMateria({ nombre: nombre.trim(), desde, hasta, horarios });
    }
    onCerrar();
  };

  return (
    <>
      <div className="popover__fila">
        <span className="popover__etiqueta">Nombre</span>
        <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Análisis de Sistemas" />
      </div>
      <div className="popover__fila">
        <span className="popover__etiqueta">Desde</span>
        <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
      </div>
      <div className="popover__fila">
        <span className="popover__etiqueta">Hasta</span>
        <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
      </div>

      {horarios.map((h, i) => (
        <div key={i} className="popover__fila" style={{ borderTop: "1px solid var(--line)", paddingTop: 8 }}>
          <span className="popover__etiqueta">Horario {i + 1}</span>
          <select value={h.dia} onChange={(e) => actualizarHorario(i, { dia: Number(e.target.value) as DiaSemana })}>
            {NOMBRES_DIA.map((n, idx) => (
              <option key={idx} value={idx}>
                {n}
              </option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 6 }}>
            <input type="time" value={h.horaInicio} onChange={(e) => actualizarHorario(i, { horaInicio: e.target.value })} />
            <input type="time" value={h.horaFin} onChange={(e) => actualizarHorario(i, { horaFin: e.target.value })} />
          </div>
          <select value={h.tipo} onChange={(e) => actualizarHorario(i, { tipo: e.target.value as TipoClase })}>
            <option value="teorica">Teórica</option>
            <option value="practica">Práctica</option>
            <option value="laboratorio">Laboratorio</option>
          </select>
          <input value={h.lugar ?? ""} onChange={(e) => actualizarHorario(i, { lugar: e.target.value })} placeholder="Aula / lugar" />
          {horarios.length > 1 && (
            <button className="boton-secundario" onClick={() => setHorarios((prev) => prev.filter((_, idx) => idx !== i))}>
              Quitar horario
            </button>
          )}
        </div>
      ))}
      <button className="boton-secundario" onClick={() => setHorarios((prev) => [...prev, horarioVacio()])}>
        + Agregar horario
      </button>

      <div className="popover__acciones">
        {materiaInicial && (
          <button
            className="boton-secundario"
            onClick={() => {
              store.eliminarMateria(materiaInicial.id);
              onCerrar();
            }}
          >
            Eliminar
          </button>
        )}
        <button className="boton-primario" onClick={guardar}>
          Guardar
        </button>
      </div>
    </>
  );
}

export function FacultadView() {
  const store = useStore();
  const popoverNueva = usarPopoverAnclado<void>();
  const popoverEditar = usarPopoverAnclado<Materia>();

  return (
    <section className="vista">
      <div className="vista__encabezado">
        <h1>Facultad</h1>
        <button className="boton-primario" onClick={popoverNueva.abrir}>
          + Nueva materia
        </button>
      </div>

      <div className="grilla-materias">
        {store.materias.map((materia) => (
          <button key={materia.id} className="materia-card" onClick={(e) => popoverEditar.abrir(e, materia)} style={{ cursor: "pointer" }}>
            <h3>{materia.nombre}</h3>
            {materia.horarios.map((h, i) => (
              <div key={i} className="materia-card__horario mono">
                {NOMBRES_DIA[h.dia]} {h.horaInicio}–{h.horaFin} {h.lugar ? `· ${h.lugar}` : ""} ·{" "}
                {h.tipo === "laboratorio" ? "Laboratorio" : h.tipo === "practica" ? "Práctica" : "Teórica"}
              </div>
            ))}
            {materia.fechasImportantes && materia.fechasImportantes.length > 0 && (
              <div className="materia-card__fechas">
                {materia.fechasImportantes.map((f) => (
                  <div key={f.id} className="fecha-importante">
                    <span>
                      {f.tipo === "parcial" ? "Parcial" : f.tipo === "entrega" ? "Entrega" : "Final"}: {f.titulo}
                    </span>
                    <span className="mono">{format(new Date(`${f.fecha}T00:00:00`), "d MMM", { locale: es })}</span>
                  </div>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>

      {popoverNueva.abierto && (
        <Popover anchorRect={popoverNueva.anchorRect!} onCerrar={popoverNueva.cerrar} ancho={340}>
          <FormularioMateria onCerrar={popoverNueva.cerrar} />
        </Popover>
      )}

      {popoverEditar.abierto && popoverEditar.payload && (
        <Popover anchorRect={popoverEditar.anchorRect!} onCerrar={popoverEditar.cerrar} ancho={340}>
          <FormularioMateria materiaInicial={popoverEditar.payload} onCerrar={popoverEditar.cerrar} />
        </Popover>
      )}
    </section>
  );
}
