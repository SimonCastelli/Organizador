import { VISTAS } from "../lib/vistas";
import type { Calendario, Vista } from "@organizador/shared";

interface SidebarProps {
  vistaActual: Vista;
  onCambiarVista: (vista: Vista) => void;
  calendarios: Calendario[];
  onToggleCalendario: (id: string) => void;
}

export function Sidebar({ vistaActual, onCambiarVista, calendarios, onToggleCalendario }: SidebarProps) {
  return (
    <nav className="sidebar" aria-label="Navegación principal">
      <div className="sidebar__marca">
        <strong>Organizador</strong>
      </div>

      <div className="sidebar__nav">
        {VISTAS.map((v) => (
          <button
            key={v.id}
            className="sidebar__link"
            aria-current={vistaActual === v.id ? "page" : undefined}
            onClick={() => onCambiarVista(v.id)}
          >
            {v.etiqueta}
          </button>
        ))}
      </div>

      <div className="sidebar__seccion">
        <span className="sidebar__titulo-seccion">Calendarios</span>
        {calendarios.map((c) => (
          <button
            key={c.id}
            className="sidebar__calendario"
            data-visible={c.visible}
            data-categoria={c.categoria}
            onClick={() => onToggleCalendario(c.id)}
            aria-pressed={c.visible}
          >
            <span className="punto" />
            {c.nombre}
          </button>
        ))}
      </div>
    </nav>
  );
}
