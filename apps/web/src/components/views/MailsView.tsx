import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useStore } from "../../lib/store";

/** En la beta los mails vienen mockeados (ver seed.ts). En la Fase 2 los
 * llena el job diario de Gmail: clasificación relevante/ruido + resumen por
 * LLM (o reglas si no hay API key) y detección de fecha/hora con parse-nl. */
export function MailsView() {
  const store = useStore();

  const crearEventoDesdeMail = (mailId: string) => {
    const mail = store.mails.find((m) => m.id === mailId);
    if (!mail?.eventoSugerido) return;
    store.crearEvento({
      calendarioId: "personal",
      titulo: mail.eventoSugerido.titulo,
      inicio: mail.eventoSugerido.inicio,
      fin: mail.eventoSugerido.fin,
    });
  };

  return (
    <section className="vista">
      <div className="vista__encabezado" data-num="06">
        <h1>Mails</h1>
        <span className="vista__nota">Resumen diario · 08:00</span>
      </div>

      <div className="lista-mails">
        {store.mails.map((mail) => (
          <article className="mail-card" key={mail.id} data-categoria={mail.categoria}>
            <div className="mail-card__cabecera">
              <span className="mail-card__de mono">{mail.de}</span>
              <span className="chip" data-categoria={mail.categoria === "relevante" ? "mail" : undefined}>
                {mail.categoria === "relevante" ? "Relevante" : "Ruido"}
              </span>
            </div>
            <span className="mail-card__asunto">{mail.asunto}</span>
            <span className="mail-card__resumen">{mail.resumen}</span>
            <div className="mail-card__acciones">
              <a href={mail.urlGmail} target="_blank" rel="noopener noreferrer" onClick={() => store.marcarMailLeido(mail.id)}>
                Abrir en Gmail
              </a>
              {mail.eventoSugerido && (
                <button onClick={() => crearEventoDesdeMail(mail.id)}>
                  Crear evento · {format(new Date(mail.eventoSugerido.inicio), "d MMM HH:mm", { locale: es })}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
