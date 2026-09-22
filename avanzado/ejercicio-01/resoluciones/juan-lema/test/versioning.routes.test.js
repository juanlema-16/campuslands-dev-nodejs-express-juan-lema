import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { startApp } from "../test-support/client.js";

let client;
beforeEach(async () => {
  client = await startApp(createApp());
});
afterEach(() => client.close());

describe("GET /health", () => {
  it("responde ok sin necesitar version", async () => {
    const response = await client.request("GET", "/health");

    assert.equal(response.status, 200);
    assert.equal(response.body.ok, true);
  });
});

describe("GET /versions", () => {
  it("documenta v1 como deprecated y v2 como active", async () => {
    const response = await client.request("GET", "/versions");

    assert.equal(response.status, 200);
    assert.equal(response.body.data.v1.status, "deprecated");
    assert.equal(response.body.data.v2.status, "active");
    assert.equal(response.body.data.v1.successor, "/v2/characters");
  });
});

describe("v1 y v2 comparten los mismos datos (una sola fuente de verdad)", () => {
  it("un personaje creado en v1 aparece en v2 con el mismo id, y viceversa", async () => {
    const createdInV1 = await client.request("POST", "/v1/characters", { json: { name: "Arden", class: "guerrero", level: 5 } });
    const seenInV2 = await client.request("GET", `/v2/characters/${createdInV1.body.data.id}`);

    assert.equal(seenInV2.status, 200);
    assert.equal(seenInV2.body.data.id, createdInV1.body.data.id);

    const createdInV2 = await client.request("POST", "/v2/characters", { json: { name: "Sylas", class: "mago", level: 8 } });
    const seenInV1 = await client.request("GET", `/v1/characters/${createdInV2.body.data.id}`);

    assert.equal(seenInV1.status, 200);
    assert.equal(seenInV1.body.data.id, createdInV2.body.data.id);
  });

  it("GET /v1/characters y GET /v2/characters listan la misma cantidad de personajes", async () => {
    await client.request("POST", "/v1/characters", { json: { name: "Arden", class: "guerrero", level: 5 } });
    await client.request("POST", "/v2/characters", { json: { name: "Sylas", class: "mago", level: 8 } });

    const v1List = await client.request("GET", "/v1/characters");
    const v2List = await client.request("GET", "/v2/characters");

    assert.equal(v1List.body.data.length, 2);
    assert.equal(v2List.body.data.length, 2);
  });
});

describe("v1 mantiene su forma plana (nunca cambia, es el contrato viejo)", () => {
  it("201 al crear, con hp/attack/defense como campos sueltos", async () => {
    const response = await client.request("POST", "/v1/characters", { json: { name: "Arden", class: "guerrero", level: 5 } });

    assert.equal(response.status, 201);
    assert.deepEqual(response.body.data, { id: 1, name: "Arden", class: "guerrero", level: 5, hp: 80, attack: 18, defense: 11 });
    assert.equal(response.headers.get("location"), "/v1/characters/1");
  });

  it("GET /v1/characters/:id devuelve la misma forma plana", async () => {
    const created = await client.request("POST", "/v1/characters", { json: { name: "Arden", class: "guerrero", level: 5 } });
    const fetched = await client.request("GET", `/v1/characters/${created.body.data.id}`);

    assert.deepEqual(fetched.body.data, created.body.data);
    assert.equal("stats" in fetched.body.data, false);
  });

  it("responde los headers Deprecation, Sunset y Link (RFC 8594 + deprecation draft)", async () => {
    const response = await client.request("GET", "/v1/characters");

    assert.equal(response.headers.get("deprecation"), "true");
    assert.equal(response.headers.get("sunset"), "2026-12-31");
    assert.equal(response.headers.get("link"), '</v2/characters>; rel="successor-version"');
  });

  it("los headers de deprecacion aparecen tambien en las respuestas de error de v1", async () => {
    const response = await client.request("GET", "/v1/characters/999");

    assert.equal(response.status, 404);
    assert.equal(response.headers.get("deprecation"), "true");
  });
});

describe("v2 introduce el cambio de contrato: hp/attack/defense anidados en stats", () => {
  it("201 al crear, sin los headers de deprecacion", async () => {
    const response = await client.request("POST", "/v2/characters", { json: { name: "Sylas", class: "mago", level: 8 } });

    assert.equal(response.status, 201);
    assert.deepEqual(response.body.data, { id: 1, name: "Sylas", class: "mago", level: 8, stats: { hp: 95, attack: 28, defense: 10 } });
    assert.equal(response.headers.get("deprecation"), null);
    assert.equal(response.headers.get("location"), "/v2/characters/1");
  });

  it("GET /v2/characters/:id devuelve la misma forma anidada", async () => {
    const created = await client.request("POST", "/v2/characters", { json: { name: "Sylas", class: "mago", level: 8 } });
    const fetched = await client.request("GET", `/v2/characters/${created.body.data.id}`);

    assert.deepEqual(fetched.body.data, created.body.data);
    assert.equal("hp" in fetched.body.data, false);
  });
});

describe("las reglas de negocio son identicas en ambas versiones (viven una sola vez)", () => {
  for (const version of ["v1", "v2"]) {
    it(`${version}: 400 INVALID_BODY con una clase desconocida`, async () => {
      const response = await client.request("POST", `/${version}/characters`, { json: { name: "Arden", class: "bardo", level: 5 } });

      assert.equal(response.status, 400);
      assert.equal(response.body.code, "INVALID_BODY");
    });

    it(`${version}: 404 NOT_FOUND con un id inexistente`, async () => {
      assert.equal((await client.request("GET", `/${version}/characters/999`)).body.code, "NOT_FOUND");
    });

    it(`${version}: 400 INVALID_ID con un id no numerico`, async () => {
      assert.equal((await client.request("GET", `/${version}/characters/abc`)).body.code, "INVALID_ID");
    });
  }
});

describe("errores generales", () => {
  it("404 ROUTE_NOT_FOUND en una version inexistente (v3)", async () => {
    const response = await client.request("GET", "/v3/characters");

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "ROUTE_NOT_FOUND");
  });

  it("400 INVALID_BODY si se envia POST sin Content-Type ni cuerpo (req.body llega undefined)", async () => {
    const response = await client.request("POST", "/v1/characters");

    assert.equal(response.status, 400);
    assert.equal(response.body.code, "INVALID_BODY");
  });

  it("400 INVALID_JSON si el cuerpo no es JSON valido", async () => {
    const response = await client.request("POST", "/v2/characters", { body: "{oops", headers: { "Content-Type": "application/json" } });

    assert.equal(response.status, 400);
    assert.equal(response.body.code, "INVALID_JSON");
  });

  it("un fallo interno inesperado responde 500 generico, no lo filtra y lo registra", async (t) => {
    const log = t.mock.method(console, "error", () => {});
    const failure = new Error("bug interno con datos sensibles");
    const broken = await startApp(createApp({ characters: { list: () => { throw failure; }, getById() {}, create() {} } }));

    try {
      const response = await broken.request("GET", "/v2/characters");

      assert.equal(response.status, 500);
      assert.deepEqual(response.body, { ok: false, code: "INTERNAL_ERROR", message: "Error interno" });
      assert.deepEqual(log.mock.calls.map((call) => call.arguments[0]), [failure]);
    } finally {
      await broken.close();
    }
  });
});
