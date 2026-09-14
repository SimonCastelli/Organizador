import { useState } from "react";

interface PantallaLoginProps {
  onIniciarSesion: (token: string) => Promise<boolean>;
}

/** No es un modal: mientras hace falta loguearse (solo pasa si configuraste
 * un servidor con VITE_API_URL) esta es toda la página — el resto de la app
 * sigue funcionando 100% local hasta que entrás. */
export function PantallaLogin({ onIniciarSesion }: PantallaLoginProps) {
  const [token, setToken] = useState("");
  const [error, setError] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (!token.trim() || enviando) return;
    setEnviando(true);
    const ok = await onIniciarSesion(token.trim());
    setEnviando(false);
    setError(!ok);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "min(360px, 100%)", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Organizador</h1>
          <p className="vista__nota">Ingresá tu token de acceso para sincronizar con el servidor.</p>
        </div>
        <div className="popover__fila">
          <input
            autoFocus
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void enviar()}
            placeholder="Token"
          />
        </div>
        {error && <span className="mono" style={{ color: "var(--cat-lab)", fontSize: 12.5 }}>Token inválido.</span>}
        <button className="boton-primario" onClick={() => void enviar()} disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </div>
    </div>
  );
}
