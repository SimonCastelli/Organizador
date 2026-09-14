interface ToastProps {
  mensaje: string;
  onDeshacer: () => void;
  onCerrar: () => void;
}

/** Undo por toast: la app nunca pide confirmación antes de borrar, borra y
 * ofrece 6s para deshacer. */
export function Toast({ mensaje, onDeshacer, onCerrar }: ToastProps) {
  return (
    <div className="toast" role="status">
      <span>{mensaje}</span>
      <button
        onClick={() => {
          onDeshacer();
          onCerrar();
        }}
      >
        Deshacer
      </button>
    </div>
  );
}
