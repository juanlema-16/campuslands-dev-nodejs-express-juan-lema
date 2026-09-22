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

async function createClub(overrides) {
  return (await client.request("POST", "/clubs", { json: overrides })).body.data;
}
async function createPlayer(name, clubId) {
  return (await client.request("POST", "/players", { json: { name, clubId } })).body.data;
}

describe("GET /health", () => {
  it("responde ok", async () => {
    assert.equal((await client.request("GET", "/health")).status, 200);
  });
});

describe("clubes y jugadores (CRUD basico)", () => {
  it("201 al crear un club y 200 al listarlo/consultarlo", async () => {
    const created = await client.request("POST", "/clubs", { json: { name: "River", budget: 500 } });
    assert.equal(created.status, 201);

    assert.equal((await client.request("GET", "/clubs")).body.data.length, 1);
    assert.equal((await client.request("GET", `/clubs/${created.body.data.id}`)).body.data.name, "River");
  });

  it("404 CLUB_NOT_FOUND con un id inexistente", async () => {
    assert.equal((await client.request("GET", "/clubs/999")).status, 404);
  });

  it("201 al agregar un jugador a un club y 200 al listarlos", async () => {
    const club = await createClub({ name: "River" });
    const response = await client.request("POST", "/players", { json: { name: "Messi", clubId: club.id } });

    assert.equal(response.status, 201);
    assert.equal((await client.request("GET", "/players")).body.data.length, 1);
  });

  it("409 SQUAD_FULL al superar el cupo del club", async () => {
    const club = await createClub({ name: "River", maxSquadSize: 1 });
    await createPlayer("Messi", club.id);

    const response = await client.request("POST", "/players", { json: { name: "Otro", clubId: club.id } });
    assert.equal(response.status, 409);
    assert.equal(response.body.code, "SQUAD_FULL");
  });
});

describe("POST /transfers (transaccion simulada de un fichaje)", () => {
  it("201 y ajusta presupuestos y club del jugador en un fichaje exitoso", async () => {
    const from = await createClub({ name: "River", budget: 0 });
    const to = await createClub({ name: "Boca", budget: 1000 });
    const player = await createPlayer("Messi", from.id);

    const response = await client.request("POST", "/transfers", { json: { playerId: player.id, toClubId: to.id, fee: 300 } });

    assert.equal(response.status, 201);
    assert.equal((await client.request("GET", `/clubs/${from.id}`)).body.data.budget, 300);
    assert.equal((await client.request("GET", `/clubs/${to.id}`)).body.data.budget, 700);
    assert.equal((await client.request("GET", "/transfers")).body.data.length, 1);
  });

  it("409 INSUFFICIENT_BUDGET si el comprador no puede pagar la cuota", async () => {
    const from = await createClub({ name: "River" });
    const to = await createClub({ name: "Boca", budget: 100 });
    const player = await createPlayer("Messi", from.id);

    const response = await client.request("POST", "/transfers", { json: { playerId: player.id, toClubId: to.id, fee: 300 } });

    assert.equal(response.status, 409);
    assert.equal(response.body.code, "INSUFFICIENT_BUDGET");
  });

  it("409 SQUAD_FULL y ambos presupuestos quedan intactos por la ruta HTTP real (rollback verificado)", async () => {
    const from = await createClub({ name: "River", budget: 0 });
    const to = await createClub({ name: "Boca", budget: 1000, maxSquadSize: 1 });
    await createPlayer("Ya en Boca", to.id);
    const player = await createPlayer("Messi", from.id);

    const response = await client.request("POST", "/transfers", { json: { playerId: player.id, toClubId: to.id, fee: 300 } });

    assert.equal(response.status, 409);
    assert.equal(response.body.code, "SQUAD_FULL");

    assert.equal((await client.request("GET", `/clubs/${from.id}`)).body.data.budget, 0);
    assert.equal((await client.request("GET", `/clubs/${to.id}`)).body.data.budget, 1000);
    assert.equal((await client.request("GET", "/players")).body.data.find((p) => p.id === player.id).clubId, from.id);
    assert.deepEqual((await client.request("GET", "/transfers")).body.data, []);
  });

  it("409 SAME_CLUB si el jugador ya esta en ese club", async () => {
    const club = await createClub({ name: "River" });
    const player = await createPlayer("Messi", club.id);

    const response = await client.request("POST", "/transfers", { json: { playerId: player.id, toClubId: club.id, fee: 0 } });

    assert.equal(response.status, 409);
    assert.equal(response.body.code, "SAME_CLUB");
  });

  it("400 INVALID_INPUT con un fee invalido", async () => {
    const from = await createClub({ name: "River" });
    const to = await createClub({ name: "Boca", budget: 1000 });
    const player = await createPlayer("Messi", from.id);

    const response = await client.request("POST", "/transfers", { json: { playerId: player.id, toClubId: to.id, fee: -1 } });
    assert.equal(response.status, 400);
  });
});

describe("errores generales", () => {
  it("404 ROUTE_NOT_FOUND en una ruta desconocida", async () => {
    const response = await client.request("GET", "/nada");

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "ROUTE_NOT_FOUND");
  });

  it("400 INVALID_JSON si el cuerpo no es JSON valido", async () => {
    const response = await client.request("POST", "/clubs", { body: "{oops", headers: { "Content-Type": "application/json" } });

    assert.equal(response.status, 400);
    assert.equal(response.body.code, "INVALID_JSON");
  });

  it("un fallo interno inesperado responde 500 generico, no lo filtra y lo registra", async (t) => {
    const log = t.mock.method(console, "error", () => {});
    const failure = new Error("bug interno con datos sensibles");
    const broken = await startApp(
      createApp({ transfers: { createClub: () => { throw failure; }, listClubs() {}, getClub() {}, createPlayer() {}, listPlayers() {}, transfer() {}, listTransfers() {} } }),
    );

    try {
      const response = await broken.request("POST", "/clubs");

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
