import {
  eachDayOfInterval,
  format,
  max as maxFecha,
  min as minFecha,
  parseISO,
  set,
  startOfDay,
} from "date-fns";
import type { ClaseGenerada, Materia } from "@organizador/shared";

/** Clave estable de una instancia de clase, usada como id sintético y como
 * llave en `overrides`/`eliminados`. `indiceHorario` es la posición del
 * HorarioClase dentro de `materia.horarios` (una materia puede tener varios
 * horarios semanales: teórica lunes, práctica miércoles, etc). */
export function claveInstancia(
  materiaId: string,
  fechaISO: string,
  indiceHorario: number,
): string {
  return `${materiaId}:${fechaISO}:${indiceHorario}`;
}

function aFechaHora(fechaISO: string, horaHHmm: string): string {
  const [horas, minutos] = horaHHmm.split(":").map(Number);
  return set(parseISO(fechaISO), {
    hours: horas,
    minutes: minutos,
    seconds: 0,
    milliseconds: 0,
  }).toISOString();
}

/** Genera las clases de facultad que caen dentro de `rango`, a partir de las
 * materias activas. Las clases no son filas: se recalculan siempre desde
 * `materia.horarios` + `desde`/`hasta`, salteando `eliminados` y aplicando
 * `overrides` para ediciones puntuales (cambio de aula, horario corrido). */
export function generarClases(
  materias: Materia[],
  rango: { desde: Date; hasta: Date },
): ClaseGenerada[] {
  const clases: ClaseGenerada[] = [];

  for (const materia of materias) {
    if (materia.deletedAt) continue;

    const inicioCuatri = startOfDay(parseISO(materia.desde));
    const finCuatri = startOfDay(parseISO(materia.hasta));
    const inicioVentana = maxFecha([inicioCuatri, startOfDay(rango.desde)]);
    const finVentana = minFecha([finCuatri, startOfDay(rango.hasta)]);
    if (inicioVentana > finVentana) continue;

    const dias = eachDayOfInterval({ start: inicioVentana, end: finVentana });

    for (const dia of dias) {
      const fechaISO = format(dia, "yyyy-MM-dd");

      materia.horarios.forEach((horario, indiceHorario) => {
        if (horario.dia !== dia.getDay()) return;

        const clave = claveInstancia(materia.id, fechaISO, indiceHorario);
        if (materia.eliminados.includes(clave)) return;

        const override = materia.overrides[clave];

        clases.push({
          id: clave,
          materiaId: materia.id,
          materiaNombre: materia.nombre,
          titulo: override?.titulo ?? materia.nombre,
          inicio: aFechaHora(fechaISO, override?.horaInicio ?? horario.horaInicio),
          fin: aFechaHora(fechaISO, override?.horaFin ?? horario.horaFin),
          lugar: override?.lugar ?? horario.lugar,
          tipo: horario.tipo,
        });
      });
    }
  }

  return clases.sort((a, b) => a.inicio.localeCompare(b.inicio));
}
