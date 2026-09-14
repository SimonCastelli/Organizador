import { describe, expect, it } from "vitest";
import { parseNL } from "../lib/parse-nl";

// Ancla fija para que los tests no dependan del día en que corren.
// 2026-09-14 es lunes.
const LUNES = new Date(2026, 8, 14, 10, 0, 0);

describe("parseNL", () => {
  it("no detecta nada en texto sin fecha/hora", () => {
    const r = parseNL("comprar café", LUNES);
    expect(r.inicio).toBeNull();
    expect(r.fin).toBeNull();
    expect(r.todoElDia).toBe(false);
    expect(r.titulo).toBe("comprar café");
  });

  it("detecta 'hoy'", () => {
    const r = parseNL("hoy junta de laboratorio", LUNES);
    expect(r.inicio?.toDateString()).toBe(LUNES.toDateString());
    expect(r.todoElDia).toBe(true);
    expect(r.titulo).toBe("junta de laboratorio");
  });

  it("detecta 'mañana'", () => {
    const r = parseNL("mañana entregar tp", LUNES);
    const esperado = new Date(2026, 8, 15);
    expect(r.inicio?.toDateString()).toBe(esperado.toDateString());
    expect(r.titulo).toBe("entregar tp");
  });

  it("detecta 'pasado mañana'", () => {
    const r = parseNL("pasado mañana parcial", LUNES);
    const esperado = new Date(2026, 8, 16);
    expect(r.inicio?.toDateString()).toBe(esperado.toDateString());
    expect(r.titulo).toBe("parcial");
  });

  it("detecta 'en N días'", () => {
    const r = parseNL("en 3 días devolver libro", LUNES);
    const esperado = new Date(2026, 8, 17);
    expect(r.inicio?.toDateString()).toBe(esperado.toDateString());
    expect(r.titulo).toBe("devolver libro");
  });

  it("detecta un día de la semana sin 'próximo' (esta semana)", () => {
    const r = parseNL("el viernes final", LUNES);
    // Lunes 14 -> viernes de esta semana es el 18.
    const esperado = new Date(2026, 8, 18);
    expect(r.inicio?.toDateString()).toBe(esperado.toDateString());
    expect(r.titulo).toBe("final");
  });

  it("cuando hoy ES el día pedido, se queda con hoy", () => {
    const r = parseNL("el lunes reunión", LUNES);
    expect(r.inicio?.toDateString()).toBe(LUNES.toDateString());
  });

  it("'el próximo <día>' fuerza la semana que viene aunque hoy coincida", () => {
    const r = parseNL("el próximo lunes reunión", LUNES);
    const esperado = new Date(2026, 8, 21);
    expect(r.inicio?.toDateString()).toBe(esperado.toDateString());
  });

  it("detecta hora con 'a las HH'", () => {
    const r = parseNL("hoy a las 15 reunión", LUNES);
    expect(r.inicio?.getHours()).toBe(15);
    expect(r.inicio?.getMinutes()).toBe(0);
    expect(r.todoElDia).toBe(false);
    expect(r.fin?.getTime()).toBe((r.inicio?.getTime() ?? 0) + 60 * 60 * 1000);
  });

  it("detecta hora en formato 'HHhs'", () => {
    const r = parseNL("mañana 15hs laboratorio", LUNES);
    expect(r.inicio?.getHours()).toBe(15);
    expect(r.titulo).toBe("laboratorio");
  });

  it("detecta hora con minutos 'HH:mm'", () => {
    const r = parseNL("viernes 14:30 defensa de tp", LUNES);
    expect(r.inicio?.getHours()).toBe(14);
    expect(r.inicio?.getMinutes()).toBe(30);
    expect(r.titulo).toBe("defensa de tp");
  });

  it("detecta 'N y media'", () => {
    const r = parseNL("hoy 10 y media café", LUNES);
    expect(r.inicio?.getHours()).toBe(10);
    expect(r.inicio?.getMinutes()).toBe(30);
  });

  it("detecta 'mediodía' y 'medianoche'", () => {
    expect(parseNL("hoy mediodía almuerzo", LUNES).inicio?.getHours()).toBe(12);
    expect(parseNL("hoy medianoche cierre", LUNES).inicio?.getHours()).toBe(0);
  });

  it("cuando hay fecha pero no hora, el evento queda todo el día", () => {
    const r = parseNL("mañana entrega", LUNES);
    expect(r.todoElDia).toBe(true);
    expect(r.fin).toBeNull();
  });
});
