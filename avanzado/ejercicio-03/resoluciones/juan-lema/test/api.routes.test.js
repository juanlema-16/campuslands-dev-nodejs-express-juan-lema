import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { errorHandler } from "../src/middlewares/error-handler.js";
import { startApp } from "../test-support/client.js";

const abilities = { passive: "Fuego interior", q: "Bola de fuego", w: "Escudo de fenix", e: "Combustion", r: "Furia del fenix" };
const validBody = { name: "Kaelthas", role: "medio", difficulty: 5, tags: ["control"], releaseYear: 2015, abilities };

let client;
beforeEach(async () => {
  client = await startApp(createApp());
});
afterEach(() => client.close());

describe("GET /health", () => {
  it("responde ok", async () => {
    assert.equal((await client.request("GET", "/health")).status, 200);
  });
});

describe("POST /champions", () => {
  it("201 con Location al crear", async () => {
    const response = await client.request("POST", "/champions", { json: validBody });

    assert.equal(response.status, 201);
    assert.equal(response.headers.get("location"), "/champions/1");
    assert.deepEqual(response.body.data, { id: 1, ...validBody });
  });

  it("400 VALIDATION_ERROR con TODOS los campos invalidos listados en 'details', no solo el primero", async () => {
    const response = await client.request("POST", "/champions", { json: { name: "A", role: "bardo", difficulty: 99, tags: [], releaseYear: 1, abilities: {} } });

    assert.equal(response.status, 400);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.ok(Array.isArray(response.body.details));
    const paths = response.body.details.map((d) => d.path);
    for (const field of ["body.name", "body.role", "body.difficulty", "body.tags", "body.releaseYear"]) assert.ok(paths.includes(field), `falta ${field} en ${JSON.stringify(paths)}`);
  });

  it("400 con un campo extra (mass assignment) rechazado por el schema, no crea nada", async () => {
    const response = await client.request("POST", "/champions", { json: { ...validBody, id: 999 } });

    assert.equal(response.status, 400);
    assert.deepEqual((await client.request("GET", "/champions")).body.data, []);
  });

  it("409 NAME_TAKEN con un nombre repetido", async () => {
    await client.request("POST", "/champions", { json: validBody });
    const response = await client.request("POST", "/champions", { json: { ...validBody, name: "kaelthas" } });

    assert.equal(response.status, 409);
    assert.equal(response.body.code, "NAME_TAKEN");
  });

  it("400 si no hay cuerpo", async () => {
    assert.equal((await client.request("POST", "/champions")).status, 400);
  });
});

describe("GET /champions y GET /champions/:id (coercion real por HTTP)", () => {
  beforeEach(async () => {
    await client.request("POST", "/champions", { json: { ...validBody, name: "Alto", role: "top", difficulty: 3 } });
    await client.request("POST", "/champions", { json: { ...validBody, name: "Medio", role: "medio", difficulty: 8 } });
  });

  it("?minDifficulty llega como string por la URL pero el filtro opera con un numero real", async () => {
    const response = await client.request("GET", "/champions?minDifficulty=8");

    assert.equal(response.status, 200);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].name, "Medio");
  });

  it("combina ?role y ?minDifficulty", async () => {
    assert.equal((await client.request("GET", "/champions?role=top&minDifficulty=8")).body.data.length, 0);
    assert.equal((await client.request("GET", "/champions?role=top&minDifficulty=1")).body.data.length, 1);
  });

  it("400 VALIDATION_ERROR con un parametro de query desconocido", async () => {
    const response = await client.request("GET", "/champions?rol=top");

    assert.equal(response.status, 400);
    assert.equal(response.body.code, "VALIDATION_ERROR");
  });

  it("el id de la URL (siempre string) llega al servicio ya convertido a numero", async () => {
    const response = await client.request("GET", "/champions/1");

    assert.equal(response.status, 200);
    assert.equal(response.body.data.id, 1);
  });

  it("400 VALIDATION_ERROR con un id no numerico, antes de llegar al servicio", async () => {
    const response = await client.request("GET", "/champions/abc");

    assert.equal(response.status, 400);
    assert.equal(response.body.code, "VALIDATION_ERROR");
  });

  it("404 NOT_FOUND con un id numerico que no existe", async () => {
    const response = await client.request("GET", "/champions/999");

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "NOT_FOUND");
  });
});

describe("PATCH /champions/:id", () => {
  it("200 con una actualizacion parcial valida", async () => {
    await client.request("POST", "/champions", { json: validBody });
    const response = await client.request("PATCH", "/champions/1", { json: { difficulty: 9 } });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.difficulty, 9);
    assert.equal(response.body.data.name, "Kaelthas");
  });

  it("400 con un objeto vacio (el schema exige al menos un campo)", async () => {
    await client.request("POST", "/champions", { json: validBody });
    const response = await client.request("PATCH", "/champions/1", { json: {} });

    assert.equal(response.status, 400);
  });

  it("400 antes de tocar el servicio si el id de la URL es invalido, incluso con un body valido", async () => {
    const response = await client.request("PATCH", "/champions/abc", { json: { difficulty: 5 } });

    assert.equal(response.status, 400);
    assert.equal(response.body.code, "VALIDATION_ERROR");
  });
});

describe("errores generales", () => {
  it("404 ROUTE_NOT_FOUND en una ruta desconocida", async () => {
    const response = await client.request("GET", "/nada");

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "ROUTE_NOT_FOUND");
  });

  it("400 INVALID_JSON si el cuerpo no es JSON valido", async () => {
    const response = await client.request("POST", "/champions", { body: "{oops", headers: { "Content-Type": "application/json" } });

    assert.equal(response.status, 400);
    assert.equal(response.body.code, "INVALID_JSON");
  });

  it("un fallo interno inesperado responde 500 generico, no lo filtra y lo registra", async (t) => {
    const log = t.mock.method(console, "error", () => {});
    const failure = new Error("bug interno con datos sensibles");
    const broken = await startApp(createApp({ champions: { list: () => { throw failure; }, getById() {}, create() {}, update() {} } }));

    try {
      const response = await broken.request("GET", "/champions");

      assert.equal(response.status, 500);
      assert.deepEqual(response.body, { ok: false, code: "INTERNAL_ERROR", message: "Error interno" });
      assert.deepEqual(log.mock.calls.map((call) => call.arguments[0]), [failure]);
    } finally {
      await broken.close();
    }
  });

  it("si la respuesta ya empezo a enviarse, el manejador delega en Express", (t) => {
    const next = t.mock.fn();

    errorHandler(new Error("tarde"), {}, { headersSent: true }, next);

    assert.equal(next.mock.callCount(), 1);
  });
});
