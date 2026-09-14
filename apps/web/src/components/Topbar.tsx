import { Popover } from "./Popover";
import { usarPopoverAnclado } from "../lib/usar-popover";
import { VISTAS } from "../lib/vistas";
import type { EstadoSync, Settings, Vista } from "@organizador/shared";

interface TopbarProps {
  vistaActual: Vista;
  estadoSync: EstadoSync;
  settings: Settings;
  onActualizarSettings: (patch: Partial<Settings>) => void;
  onAbrirCmdk: () => void;
}

export function Topbar({ vistaActual, estadoSync, settings, onActualizarSettings, onAbrirCmdk }: TopbarProps) {
  const popoverAjustes = usarPopoverAnclado<void>();

  return (
    <header className="topbar">
      <h1 className="topbar__titulo">{VISTAS.find((v) => v.id === vistaActual)?.etiqueta}</h1>
      <div className="topbar__acciones">
        <span className="estado-sync" data-online={estadoSync.online}>
          <span className="estado-sync__punto" />
          {estadoSync.online ? "Al día" : `Sin conexión · ${estadoSync.pendientes} pendientes`}
        </span>

        <button className="boton-cmdk" onClick={onAbrirCmdk}>
          Buscar / crear
          <kbd>⌘K</kbd>
        </button>

        <button className="boton-secundario" onClick={popoverAjustes.abrir}>
          Ajustes
        </button>
      </div>

      {popoverAjustes.abierto && (
        <Popover anchorRect={popoverAjustes.anchorRect!} onCerrar={popoverAjustes.cerrar} ancho={260}>
          <div className="popover__fila">
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
              <input
                type="checkbox"
                checked={settings.avisosEventosProximos}
                onChange={(e) => onActualizarSettings({ avisosEventosProximos: e.target.checked })}
              />
              Avisos de eventos próximos
            </label>
          </div>
          <div className="popover__fila">
            <span className="popover__etiqueta">Minutos antes del aviso</span>
            <input
              type="number"
              min={1}
              max={120}
              value={settings.minutosAntesAviso}
              onChange={(e) => onActualizarSettings({ minutosAntesAviso: Number(e.target.value) || 10 })}
            />
          </div>
          <div className="popover__fila">
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
              <input
                type="checkbox"
                checked={settings.simularSinConexion}
                onChange={(e) => onActualizarSettings({ simularSinConexion: e.target.checked })}
              />
              Simular sin conexión
            </label>
          </div>
        </Popover>
      )}
    </header>
  );
}
