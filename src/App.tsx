import { useEffect, useState, type ComponentType } from "react";
import { CommandPalette } from "./components/CommandPalette";
import { Sidebar } from "./components/Sidebar";
import { Toast } from "./components/Toast";
import { Topbar } from "./components/Topbar";
import { FacultadView } from "./components/views/FacultadView";
import { HoyView } from "./components/views/HoyView";
import { MailsView } from "./components/views/MailsView";
import { MesView } from "./components/views/MesView";
import { SemanaView } from "./components/views/SemanaView";
import { TareasView } from "./components/views/TareasView";
import { useStore } from "./lib/store";
import type { Vista } from "./lib/types";

const VISTA_POR_ID: Record<Vista, ComponentType> = {
  hoy: HoyView,
  semana: SemanaView,
  mes: MesView,
  tareas: TareasView,
  facultad: FacultadView,
  mails: MailsView,
};

export default function App() {
  const store = useStore();
  const [vista, setVista] = useState<Vista>("hoy");
  const [cmdkAbierto, setCmdkAbierto] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdkAbierto((abierto) => !abierto);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const VistaActual = VISTA_POR_ID[vista];

  return (
    <div className="app">
      <Sidebar
        vistaActual={vista}
        onCambiarVista={setVista}
        calendarios={store.calendarios}
        onToggleCalendario={store.toggleCalendario}
      />
      <div className="app__contenido">
        <Topbar
          vistaActual={vista}
          estadoSync={store.estadoSync}
          settings={store.settings}
          onActualizarSettings={store.actualizarSettings}
          onAbrirCmdk={() => setCmdkAbierto(true)}
        />
        <VistaActual />
      </div>

      {cmdkAbierto && <CommandPalette onCerrar={() => setCmdkAbierto(false)} onIrAVista={setVista} />}

      {store.toast && (
        <Toast mensaje={store.toast.mensaje} onDeshacer={store.toast.deshacer} onCerrar={store.cerrarToast} />
      )}
    </div>
  );
}
