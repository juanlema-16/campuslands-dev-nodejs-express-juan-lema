import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { Router } from "express";
import { createApp } from "../src/app.js";
import { errorHandler } from "../src/middlewares/error-handler.js";
import { startApp } from "../test-support/client.js";

let client;
beforeEach(async () => {
  client = await startApp(createApp());
});
afterEach(() => client.close());

describe("GET /health", () => {
  it("responde ok", async () => {
    const response = await client.request("GET", "/health");

    assert.equal(response.status, 200);
    assert.equal(response.body.ok, true);
  });
});

describe("los tres modulos quedan montados y con datos semilla", () => {
  it("players y weapons vienen con datos de ejemplo", async () => {
    assert.equal((await client.request("GET", "/players")).body.data.length, 2);
    assert.equal((await client.request("GET", "/weapons")).body.data.length, 2);
    assert.equal((await client.request("GET", "/matches")).body.data.length, 0);
  });

  it("GET /players/:id y GET /weapons/:id devuelven el registro pedido", async () => {
    const player = await client.request("GET", "/players/1");
    assert.equal(player.status, 200);
    assert.equal(player.body.data.id, 1);

    const weapon = await client.request("GET", "/weapons/1");
    assert.equal(weapon.status, 200);
    assert.equal(weapon.body.data.id, 1);
  });

  it("POST /weapons crea un arma nueva con 201 y Location", async () => {
    const response = await client.request("POST", "/weapons", { json: { name: "Raptor-9", category: "pistola" } });

    assert.equal(response.status, 201);
    assert.equal(response.headers.get("location"), "/weapons/3");
    assert.equal(response.body.data.category, "pistola");
  });

  it("400/404 en GET /players/:id y GET /weapons/:id con ids invalidos o inexistentes", async () => {
    assert.equal((await client.request("GET", "/players/abc")).body.code, "INVALID_ID");
    assert.equal((await client.request("GET", "/players/999")).body.code, "NOT_FOUND");
    assert.equal((await client.request("GET", "/weapons/abc")).body.code, "INVALID_ID");
    assert.equal((await client.request("GET", "/weapons/999")).body.code, "NOT_FOUND");
  });
});

describe("POST /matches integra los tres modulos por HTTP", () => {
  it("201 al crear una partida con jugadores y armas existentes", async () => {
    const response = await client.request("POST", "/matches", { json: { mapName: "Arena Cruce", entries: [{ playerId: 1, weaponId: 1 }, { playerId: 2, weaponId: 2 }] } });

    assert.equal(response.status, 201);
    assert.equal(response.headers.get("location"), "/matches/1");
    assert.deepEqual(response.body.data.entries, [{ playerId: 1, weaponId: 1 }, { playerId: 2, weaponId: 2 }]);
  });

  it("400 INVALID_BODY si un playerId no existe (cruza al modulo players)", async () => {
    const response = await client.request("POST", "/matches", { json: { mapName: "Arena Cruce", entries: [{ playerId: 999, weaponId: 1 }, { playerId: 2, weaponId: 2 }] } });

    assert.equal(response.status, 400);
    assert.match(response.body.message, /playerId 999/);
  });

  it("400 INVALID_BODY si un weaponId no existe (cruza al modulo weapons)", async () => {
    const response = await client.request("POST", "/matches", { json: { mapName: "Arena Cruce", entries: [{ playerId: 1, weaponId: 999 }, { playerId: 2, weaponId: 1 }] } });

    assert.equal(response.status, 400);
    assert.match(response.body.message, /weaponId 999/);
  });

  it("un jugador creado por POST /players se puede usar de inmediato en una partida", async () => {
    const created = await client.request("POST", "/players", { json: { nickname: "Nova" } });
    const response = await client.request("POST", "/matches", { json: { mapName: "Arena Cruce", entries: [{ playerId: created.body.data.id, weaponId: 1 }, { playerId: 1, weaponId: 1 }] } });

    assert.equal(response.status, 201);
  });

  it("GET /matches/:id devuelve la partida creada, y 404 con un id inexistente", async () => {
    const created = await client.request("POST", "/matches", { json: { mapName: "Arena Cruce", entries: [{ playerId: 1, weaponId: 1 }, { playerId: 2, weaponId: 2 }] } });
    const fetched = await client.request("GET", `/matches/${created.body.data.id}`);

    assert.deepEqual(fetched.body.data, created.body.data);
    assert.equal((await client.request("GET", "/matches/999")).status, 404);
  });
});

describe("errores generales", () => {
  it("404 ROUTE_NOT_FOUND en una ruta desconocida", async () => {
    const response = await client.request("GET", "/nada");

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "ROUTE_NOT_FOUND");
  });

  it("400 INVALID_JSON si el cuerpo no es JSON valido", async () => {
    const response = await client.request("POST", "/players", { body: "{oops", headers: { "Content-Type": "application/json" } });

    assert.equal(response.status, 400);
    assert.equal(response.body.code, "INVALID_JSON");
  });

  it("un fallo interno inesperado responde 500 generico, no lo filtra y lo registra", async (t) => {
    const log = t.mock.method(console, "error", () => {});
    const failure = new Error("bug interno con datos sensibles");
    const broken = {
      name: "broken",
      basePath: "/broken",
      dependencies: [],
      create: () => {
        const router = Router();
        router.get("/", () => {
          throw failure;
        });
        return { router, api: {} };
      },
    };
    const brokenApp = await startApp(createApp({ modules: [broken] }));

    try {
      const response = await brokenApp.request("GET", "/broken");

      assert.equal(response.status, 500);
      assert.deepEqual(response.body, { ok: false, code: "INTERNAL_ERROR", message: "Error interno" });
      assert.deepEqual(log.mock.calls.map((call) => call.arguments[0]), [failure]);
    } finally {
      await brokenApp.close();
    }
  });

  it("si la respuesta ya empezo a enviarse, el manejador delega en Express", (t) => {
    const next = t.mock.fn();

    errorHandler(new Error("tarde"), {}, { headersSent: true }, next);

    assert.equal(next.mock.callCount(), 1);
  });
});
