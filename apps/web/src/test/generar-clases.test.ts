import { describe, expect, it } from "vitest";
import { claveInstancia, generarClases } from "../lib/generar-clases";
import type { Materia } from "@organizador/shared";

function materiaBase(): Materia {
  return {
    id: "m1",
    nombre: "Análisis de Sistemas",
    horarios: [
      { dia: 1, horaInicio: "14:00", horaFin: "17:00", lugar: "Aula 302", tipo: "teorica" },
      { dia: 5, horaInicio: "10:00", horaFin: "12:00", lugar: "Lab 1", tipo: "laboratorio" },
    ],
    // 2026-09-14 es lunes, 2026-09-27 es domingo (2 semanas completas).
    desde: "2026-09-14",
    hasta: "2026-09-27",
    overrides: {},
    eliminados: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const rango = { desde: new Date(2026, 8, 14), hasta: new Date(2026, 8, 27) };

describe("generarClases", () => {
  it("genera una clase por cada ocurrencia del horario dentro del rango", () => {
    const clases = generarClases([materiaBase()], rango);
    // Lunes 14 y 21 (teórica) + viernes 18 y 25 (laboratorio) = 4 clases.
    expect(clases).toHaveLength(4);
    expect(clases.filter((c) => c.tipo === "teorica")).toHaveLength(2);
    expect(clases.filter((c) => c.tipo === "laboratorio")).toHaveLength(2);
  });

  it("no genera clases fuera de desde/hasta de la materia", () => {
    const materia = materiaBase();
    const clases = generarClases([materia], { desde: new Date(2026, 9, 1), hasta: new Date(2026, 9, 10) });
    expect(clases).toHaveLength(0);
  });

  it("aplica overrides sin duplicar la instancia", () => {
    const materia = materiaBase();
    const clave = claveInstancia("m1", "2026-09-14", 0);
    materia.overrides[clave] = { lugar: "Aula 105", horaInicio: "15:00" };

    const clases = generarClases([materia], rango);
    const clase = clases.find((c) => c.id === clave)!;
    expect(clase.lugar).toBe("Aula 105");
    expect(new Date(clase.inicio).getHours()).toBe(15);
  });

  it("no genera una instancia marcada en eliminados", () => {
    const materia = materiaBase();
    const clave = claveInstancia("m1", "2026-09-14", 0);
    materia.eliminados.push(clave);

    const clases = generarClases([materia], rango);
    expect(clases.some((c) => c.id === clave)).toBe(false);
    // La otra ocurrencia del mismo horario (21/9) sigue estando.
    expect(clases.filter((c) => c.tipo === "teorica")).toHaveLength(1);
  });

  it("ignora materias borradas (deletedAt)", () => {
    const materia = { ...materiaBase(), deletedAt: "2026-01-01T00:00:00.000Z" };
    expect(generarClases([materia], rango)).toHaveLength(0);
  });

  it("ordena las clases generadas por fecha de inicio", () => {
    const clases = generarClases([materiaBase()], rango);
    const orden = clases.map((c) => c.inicio);
    const ordenado = [...orden].sort();
    expect(orden).toEqual(ordenado);
  });
});
