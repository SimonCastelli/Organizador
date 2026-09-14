import { addDays, nextDay, set, startOfDay, type Day } from "date-fns";

export interface ResultadoParseoNL {
  /** Instante detectado. Si no se detectó nada, es `null`. */
  inicio: Date | null;
  /** `inicio + 1h` si se detectó una hora puntual; `null` si es todo el día
   * o si no se detectó nada. */
  fin: Date | null;
  todoElDia: boolean;
  /** El texto de entrada sin los fragmentos de fecha/hora reconocidos,
   * pensado para quedar como título del evento/tarea. */
  titulo: string;
}

const DIAS_SEMANA: Record<string, Day> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  "miércoles": 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  "sábado": 6,
};

function sinTildes(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

interface Coincidencia {
  /** [inicio, fin) del fragmento a remover del título. */
  rango: [number, number];
  aplicar: (base: Date) => Date;
}

/** Busca "hoy" / "mañana" / "pasado mañana" / "en N día(s)" / un día de la
 * semana (con o sin "el próximo"). Devuelve como máximo una coincidencia de
 * fecha: la primera que aparece en el texto. */
function buscarFecha(textoOriginal: string): Coincidencia | null {
  const texto = sinTildes(textoOriginal.toLowerCase());

  const pasadoManiana = /pasado\s+ma[nñ]ana/.exec(texto);
  if (pasadoManiana) {
    return {
      rango: [pasadoManiana.index, pasadoManiana.index + pasadoManiana[0].length],
      aplicar: (base) => addDays(base, 2),
    };
  }

  const manianaMatch = /\bmanana\b/.exec(texto);
  if (manianaMatch) {
    return {
      rango: [manianaMatch.index, manianaMatch.index + manianaMatch[0].length],
      aplicar: (base) => addDays(base, 1),
    };
  }

  const hoyMatch = /\bhoy\b/.exec(texto);
  if (hoyMatch) {
    return {
      rango: [hoyMatch.index, hoyMatch.index + hoyMatch[0].length],
      aplicar: (base) => base,
    };
  }

  const enNDias = /\ben\s+(\d+)\s+dias?\b/.exec(texto);
  if (enNDias) {
    const n = Number(enNDias[1]);
    return {
      rango: [enNDias.index, enNDias.index + enNDias[0].length],
      aplicar: (base) => addDays(base, n),
    };
  }

  const diaSemanaPattern = new RegExp(
    `\\b(el\\s+proximo\\s+|el\\s+)?(${Object.keys(DIAS_SEMANA).map(sinTildes).join("|")})\\b`,
  );
  const diaSemanaMatch = diaSemanaPattern.exec(texto);
  if (diaSemanaMatch) {
    const forzarSemanaQueViene = Boolean(diaSemanaMatch[1]?.includes("proximo"));
    const nombreDia = diaSemanaMatch[2];
    const diaObjetivo = DIAS_SEMANA[nombreDia];
    return {
      rango: [diaSemanaMatch.index, diaSemanaMatch.index + diaSemanaMatch[0].length],
      aplicar: (base) => {
        if (!forzarSemanaQueViene && base.getDay() === diaObjetivo) return base;
        const siguiente = nextDay(base, diaObjetivo);
        return siguiente;
      },
    };
  }

  return null;
}

/** Busca una hora puntual: "15hs", "a las 15", "15:30", "10 y media",
 * "mediodía", "medianoche". Como en `buscarFecha`, se queda con la primera
 * coincidencia. */
function buscarHora(textoOriginal: string): { rango: [number, number]; horas: number; minutos: number } | null {
  const texto = sinTildes(textoOriginal.toLowerCase());

  const mediodia = /\bmediodia\b/.exec(texto);
  if (mediodia) {
    return { rango: [mediodia.index, mediodia.index + mediodia[0].length], horas: 12, minutos: 0 };
  }
  const medianoche = /\bmedianoche\b/.exec(texto);
  if (medianoche) {
    return { rango: [medianoche.index, medianoche.index + medianoche[0].length], horas: 0, minutos: 0 };
  }

  const horaYMedia = /\b(\d{1,2})\s+y\s+media\b/.exec(texto);
  if (horaYMedia) {
    return {
      rango: [horaYMedia.index, horaYMedia.index + horaYMedia[0].length],
      horas: Number(horaYMedia[1]),
      minutos: 30,
    };
  }

  const conDosPuntos = /\b(?:a\s+las\s+)?(\d{1,2}):(\d{2})\s*(hs\.?|horas)?\b/.exec(texto);
  if (conDosPuntos) {
    return {
      rango: [conDosPuntos.index, conDosPuntos.index + conDosPuntos[0].length],
      horas: Number(conDosPuntos[1]),
      minutos: Number(conDosPuntos[2]),
    };
  }

  const soloHoras = /\b(?:a\s+las\s+)?(\d{1,2})\s*(hs\.?|horas)\b/.exec(texto);
  if (soloHoras) {
    return {
      rango: [soloHoras.index, soloHoras.index + soloHoras[0].length],
      horas: Number(soloHoras[1]),
      minutos: 0,
    };
  }

  const aLas = /\ba\s+las\s+(\d{1,2})\b/.exec(texto);
  if (aLas) {
    return { rango: [aLas.index, aLas.index + aLas[0].length], horas: Number(aLas[1]), minutos: 0 };
  }

  return null;
}

function quitarRango(texto: string, rango: [number, number]): string {
  return texto.slice(0, rango[0]) + texto.slice(rango[1]);
}

function limpiarTitulo(texto: string): string {
  return texto
    .replace(/\s+/g, " ")
    .replace(/^[\s,.-]+|[\s,.-]+$/g, "")
    .trim();
}

/** Parsea expresiones de fecha/hora en español rioplatense dentro de una
 * frase libre (para el ⌘K y para las fechas que Gmail detecta en un mail).
 * No lanza: si no encuentra nada, devuelve `inicio: null` y el texto tal
 * cual. Cuando encuentra fecha pero no hora, el evento queda todo el día. */
export function parseNL(textoOriginal: string, ahora: Date = new Date()): ResultadoParseoNL {
  let titulo = textoOriginal;

  const fecha = buscarFecha(textoOriginal);
  if (fecha) titulo = quitarRango(titulo, fecha.rango);

  const hora = buscarHora(titulo);
  if (hora) titulo = quitarRango(titulo, hora.rango);

  titulo = limpiarTitulo(titulo);

  if (!fecha && !hora) {
    return { inicio: null, fin: null, todoElDia: false, titulo: limpiarTitulo(textoOriginal) };
  }

  const diaBase = fecha ? fecha.aplicar(startOfDay(ahora)) : startOfDay(ahora);

  if (!hora) {
    return { inicio: diaBase, fin: null, todoElDia: true, titulo };
  }

  const inicio = set(diaBase, { hours: hora.horas, minutes: hora.minutos, seconds: 0, milliseconds: 0 });
  const fin = new Date(inicio.getTime() + 60 * 60 * 1000);
  return { inicio, fin, todoElDia: false, titulo };
}
