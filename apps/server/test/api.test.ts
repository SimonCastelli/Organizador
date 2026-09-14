import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { crearApp } from "../src/app";
import { abrirDb } from "../src/db";
import type Database from "better-sqlite3";

process.env.AUTH_TOKEN = "token-de-test";
const TOKEN = process.env.AUTH_TOKEN;

let db: Database.Database;
let app: ReturnType<typeof crearApp>;

beforeEach(() => {
  db = abrirDb(":memory:");
  app = crearApp(db);
});

describe("salud y auth", () => {
  it("GET /api/salud no requiere token", async () => {
    const res = await request(app).get("/api/salud");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("rechaza sin token", async () => {
    const res = await request(app).get("/api/eventos");
    expect(res.status).toBe(401);
  });

  it("acepta con Authorization: Bearer", async () => {
    const res = await request(app).get("/api/eventos").set("Authorization", `Bearer ${TOKEN}`);
    expect(res.status).toBe(200);
  });

  it("login pone una cookie httpOnly que sirve para autenticar después", async () => {
    const agente = request.agent(app);
    const login = await agente.post("/api/auth/login").send({ token: TOKEN });
    expect(login.status).toBe(204);

    const res = await agente.get("/api/eventos");
    expect(res.status).toBe(200);
  });

  it("login con token incorrecto es 401", async () => {
    const res = await request(app).post("/api/auth/login").send({ token: "cualquier-cosa" });
    expect(res.status).toBe(401);
  });
});

describe("eventos", () => {
  const auth = () => ({ Authorization: `Bearer ${TOKEN}` });

  it("crea, lista, edita y borra (soft) un evento", async () => {
    const crear = await request(app)
      .post("/api/eventos")
      .set(auth())
      .send({ calendarioId: "personal", titulo: "Gimnasio", inicio: "2026-09-14T19:00:00.000Z", fin: "2026-09-14T20:00:00.000Z" });
    expect(crear.status).toBe(201);
    const id = crear.body.id;
    expect(crear.body.titulo).toBe("Gimnasio");
    expect(crear.body.origen).toBe("manual");

    const lista = await request(app).get("/api/eventos").set(auth());
    expect(lista.body).toHaveLength(1);

    const editar = await request(app).patch(`/api/eventos/${id}`).set(auth()).send({ titulo: "Gimnasio (cambiado)" });
    expect(editar.body.titulo).toBe("Gimnasio (cambiado)");

    const borrar = await request(app).delete(`/api/eventos/${id}`).set(auth());
    expect(borrar.body.deletedAt).not.toBeNull();

    const listaTrasBorrar = await request(app).get("/api/eventos").set(auth());
    expect(listaTrasBorrar.body).toHaveLength(0);
  });

  it("valida campos obligatorios al crear", async () => {
    const res = await request(app).post("/api/eventos").set(auth()).send({ titulo: "Sin calendario" });
    expect(res.status).toBe(400);
  });
});

describe("last-write-wins por campo", () => {
  const auth = () => ({ Authorization: `Bearer ${TOKEN}` });

  it("una mutación más vieja no pisa un campo ya actualizado por una más nueva", async () => {
    const t0 = "2026-01-01T00:00:00.000Z";
    const t1 = "2026-01-02T00:00:00.000Z";
    const t2 = "2026-01-03T00:00:00.000Z";

    // t0: crea la tarea. t2: alguien cambia el título (más nuevo).
    await request(app)
      .post("/api/sync")
      .set(auth())
      .send({
        mutaciones: [
          { entidad: "tarea", id: "t1", patch: { titulo: "Original", hecha: false }, timestamp: t0 },
          { entidad: "tarea", id: "t1", patch: { titulo: "Editado en el celular" }, timestamp: t2 },
        ],
      });

    // Llega tarde una mutación vieja (t1, anterior a t2) que también toca
    // título: no debería pisar "Editado en el celular". Pero además toca
    // `notas`, un campo que nadie más tocó: eso sí debe aplicarse.
    const res = await request(app)
      .post("/api/sync")
      .set(auth())
      .send({
        mutaciones: [{ entidad: "tarea", id: "t1", patch: { titulo: "Editado en la laptop (viejo)", notas: "nota nueva" }, timestamp: t1 }],
      });

    const tarea = res.body.cambios.tareas.find((t: { id: string }) => t.id === "t1");
    expect(tarea.titulo).toBe("Editado en el celular");
    expect(tarea.notas).toBe("nota nueva");
  });

  it("borrar (tombstone) también respeta LWW por campo", async () => {
    const t0 = "2026-01-01T00:00:00.000Z";
    const t1 = "2026-01-02T00:00:00.000Z";

    await request(app)
      .post("/api/sync")
      .set(auth())
      .send({ mutaciones: [{ entidad: "tarea", id: "t2", patch: { titulo: "Para borrar" }, timestamp: t0 }] });

    // Un dispositivo la borra en t1...
    await request(app)
      .post("/api/sync")
      .set(auth())
      .send({ mutaciones: [{ entidad: "tarea", id: "t2", patch: { deletedAt: t1 }, timestamp: t1 }] });

    // ...pero llega tarde una mutación vieja (t0) que la quiere resucitar
    // sin borrado: como es más vieja que t1, no debe pisar el tombstone.
    const res = await request(app)
      .post("/api/sync")
      .set(auth())
      .send({ mutaciones: [{ entidad: "tarea", id: "t2", patch: { deletedAt: null }, timestamp: t0 }] });

    const tarea = res.body.cambios.tareas.find((t: { id: string }) => t.id === "t2");
    expect(tarea).toBeUndefined(); // sigue borrada: no aparece en la lista "activa"
  });
});

describe("/sync", () => {
  const auth = () => ({ Authorization: `Bearer ${TOKEN}` });

  it("aplica mutaciones válidas y reporta las inválidas sin abortar el resto", async () => {
    const res = await request(app)
      .post("/api/sync")
      .set(auth())
      .send({
        mutaciones: [
          { entidad: "tarea", id: "ok-1", patch: { titulo: "Bien" }, timestamp: new Date().toISOString() },
          { entidad: "evento", patch: { titulo: "Sin id" }, timestamp: new Date().toISOString() },
        ],
      });

    expect(res.body.aplicadas).toBe(1);
    expect(res.body.errores).toHaveLength(1);
    expect(res.body.errores[0].entidad).toBe("evento");
  });

  it("devuelve solo lo que cambió desde el cursor `desde`", async () => {
    const t0 = new Date().toISOString();
    await request(app)
      .post("/api/sync")
      .set(auth())
      .send({ mutaciones: [{ entidad: "tarea", id: "vieja", patch: { titulo: "Vieja" }, timestamp: t0 }] });

    const cursor = new Date(Date.now() + 1000).toISOString();

    const res = await request(app)
      .post("/api/sync")
      .set(auth())
      .send({ desde: cursor, mutaciones: [{ entidad: "tarea", id: "nueva", patch: { titulo: "Nueva" }, timestamp: new Date(Date.now() + 2000).toISOString() }] });

    expect(res.body.cambios.tareas.map((t: { id: string }) => t.id)).toEqual(["nueva"]);
  });
});
