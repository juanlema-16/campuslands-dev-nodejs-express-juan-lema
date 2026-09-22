import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { errorHandler } from "../src/middlewares/error-handler.js";
import { startApp } from "../test-support/client.js";

let client;
beforeEach(async () => {
  client = await startApp(createApp());
});
afterEach(() => client.close());

async function createMatch(overrides) {
  return (await client.request("POST", "/matches", { json: overrides })).body.data;
}
async function joinPlayer(matchId, name) {
  return (await client.request("POST", `/matches/${matchId}/players`, { json: { name } })).body.data;
}

describe("GET /health", () => {
  it("responde ok", async () => {
    assert.equal((await client.request("GET", "/health")).status, 200);
  });
});

describe("POST /matches", () => {
  it("201 al crear una partida", async () => {
    const response = await client.request("POST", "/matches");

    assert.equal(response.status, 201);
    assert.deepEqual(response.body.data, { id: 1, status: "waiting", maxPlayers: 4, inventoryCapacity: 3, winner: null, players: [] });
  });

  it("400 INVALID_INPUT con maxPlayers invalido", async () => {
    const response = await client.request("POST", "/matches", { json: { maxPlayers: 1 } });

    assert.equal(response.status, 400);
    assert.equal(response.body.code, "INVALID_INPUT");
  });
});

describe("POST /matches/:id/players (unirse)", () => {
  it("201 al unirse a una partida existente", async () => {
    const match = await createMatch();
    const response = await client.request("POST", `/matches/${match.id}/players`, { json: { name: "Ana" } });

    assert.equal(response.status, 201);
    assert.equal(response.body.data.players[0].name, "Ana");
  });

  it("404 MATCH_NOT_FOUND con una partida inexistente", async () => {
    const response = await client.request("POST", "/matches/999/players", { json: { name: "Ana" } });

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "MATCH_NOT_FOUND");
  });

  it("409 MATCH_FULL al superar el cupo", async () => {
    const match = await createMatch({ maxPlayers: 2 });
    await joinPlayer(match.id, "Ana");
    await joinPlayer(match.id, "Beto");
    const response = await client.request("POST", `/matches/${match.id}/players`, { json: { name: "Caro" } });

    assert.equal(response.status, 409);
    assert.equal(response.body.code, "MATCH_FULL");
  });

  it("400 INVALID_INPUT sin nombre", async () => {
    const match = await createMatch();
    const response = await client.request("POST", `/matches/${match.id}/players`, { json: {} });

    assert.equal(response.status, 400);
    assert.equal(response.body.code, "INVALID_INPUT");
  });
});

describe("POST /matches/:id/start", () => {
  it("200 y pasa a active con 2+ jugadores", async () => {
    const match = await createMatch();
    await joinPlayer(match.id, "Ana");
    await joinPlayer(match.id, "Beto");

    const response = await client.request("POST", `/matches/${match.id}/start`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.status, "active");
  });

  it("409 NOT_ENOUGH_PLAYERS con menos de 2 jugadores", async () => {
    const match = await createMatch();
    await joinPlayer(match.id, "Ana");

    const response = await client.request("POST", `/matches/${match.id}/start`);

    assert.equal(response.status, 409);
    assert.equal(response.body.code, "NOT_ENOUGH_PLAYERS");
  });

  it("409 MATCH_ALREADY_STARTED al iniciar dos veces", async () => {
    const match = await createMatch();
    await joinPlayer(match.id, "Ana");
    await joinPlayer(match.id, "Beto");
    await client.request("POST", `/matches/${match.id}/start`);

    const response = await client.request("POST", `/matches/${match.id}/start`);

    assert.equal(response.status, 409);
    assert.equal(response.body.code, "MATCH_ALREADY_STARTED");
  });
});

describe("POST /matches/:id/players/:playerId/eliminate", () => {
  async function activeMatchWith3() {
    const match = await createMatch({ maxPlayers: 3 });
    await joinPlayer(match.id, "Ana");
    await joinPlayer(match.id, "Beto");
    await joinPlayer(match.id, "Caro");
    await client.request("POST", `/matches/${match.id}/start`);
    return match.id;
  }

  it("200 elimina a un jugador vivo", async () => {
    const matchId = await activeMatchWith3();
    const response = await client.request("POST", `/matches/${matchId}/players/1/eliminate`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.players[0].alive, false);
  });

  it("termina la partida y define ganador cuando queda un solo sobreviviente", async () => {
    const matchId = await activeMatchWith3();
    await client.request("POST", `/matches/${matchId}/players/1/eliminate`);
    const response = await client.request("POST", `/matches/${matchId}/players/2/eliminate`);

    assert.equal(response.body.data.status, "finished");
    assert.equal(response.body.data.winner, 3);
  });

  it("409 PLAYER_ELIMINATED al eliminar dos veces al mismo jugador", async () => {
    const matchId = await activeMatchWith3();
    await client.request("POST", `/matches/${matchId}/players/1/eliminate`);
    const response = await client.request("POST", `/matches/${matchId}/players/1/eliminate`);

    assert.equal(response.status, 409);
    assert.equal(response.body.code, "PLAYER_ELIMINATED");
  });

  it("404 PLAYER_NOT_FOUND con un jugador que no existe", async () => {
    const matchId = await activeMatchWith3();
    const response = await client.request("POST", `/matches/${matchId}/players/999/eliminate`);

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "PLAYER_NOT_FOUND");
  });

  it("409 MATCH_NOT_ACTIVE si la partida no ha iniciado", async () => {
    const match = await createMatch();
    await joinPlayer(match.id, "Ana");

    const response = await client.request("POST", `/matches/${match.id}/players/1/eliminate`);

    assert.equal(response.status, 409);
    assert.equal(response.body.code, "MATCH_NOT_ACTIVE");
  });
});

describe("POST /matches/:id/players/:playerId/loot", () => {
  async function activeMatch(inventoryCapacity) {
    const match = await createMatch({ inventoryCapacity });
    await joinPlayer(match.id, "Ana");
    await joinPlayer(match.id, "Beto");
    await client.request("POST", `/matches/${match.id}/start`);
    return match.id;
  }

  it("200 agrega un objeto al inventario", async () => {
    const matchId = await activeMatch();
    const response = await client.request("POST", `/matches/${matchId}/players/1/loot`, { json: { item: "botiquin" } });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.players[0].inventory, ["botiquin"]);
  });

  it("409 INVENTORY_FULL al superar la capacidad", async () => {
    const matchId = await activeMatch(1);
    await client.request("POST", `/matches/${matchId}/players/1/loot`, { json: { item: "botiquin" } });

    const response = await client.request("POST", `/matches/${matchId}/players/1/loot`, { json: { item: "escudo" } });

    assert.equal(response.status, 409);
    assert.equal(response.body.code, "INVENTORY_FULL");
  });

  it("400 INVALID_INPUT sin item", async () => {
    const matchId = await activeMatch();
    const response = await client.request("POST", `/matches/${matchId}/players/1/loot`, { json: {} });

    assert.equal(response.status, 400);
    assert.equal(response.body.code, "INVALID_INPUT");
  });
});

describe("GET /matches/:id", () => {
  it("200 con el estado actual de la partida", async () => {
    const match = await createMatch();
    const response = await client.request("GET", `/matches/${match.id}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.id, match.id);
  });

  it("404 MATCH_NOT_FOUND con un id inexistente", async () => {
    assert.equal((await client.request("GET", "/matches/999")).status, 404);
  });

  it("404 MATCH_NOT_FOUND con un id no numerico (sin filtrar como error 500)", async () => {
    const response = await client.request("GET", "/matches/abc");

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "MATCH_NOT_FOUND");
  });
});

describe("errores generales", () => {
  it("404 ROUTE_NOT_FOUND en una ruta desconocida", async () => {
    const response = await client.request("GET", "/nada");

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "ROUTE_NOT_FOUND");
  });

  it("400 INVALID_JSON si el cuerpo no es JSON valido", async () => {
    const response = await client.request("POST", "/matches", { body: "{oops", headers: { "Content-Type": "application/json" } });

    assert.equal(response.status, 400);
    assert.equal(response.body.code, "INVALID_JSON");
  });

  it("un fallo interno inesperado responde 500 generico, no lo filtra y lo registra", async (t) => {
    const log = t.mock.method(console, "error", () => {});
    const failure = new Error("bug interno con datos sensibles");
    const broken = await startApp(createApp({ battle: { create: () => { throw failure; }, getById() {}, join() {}, start() {}, eliminate() {}, loot() {} } }));

    try {
      const response = await broken.request("POST", "/matches");

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
