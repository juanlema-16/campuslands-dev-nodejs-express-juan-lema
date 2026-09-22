import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createBattleService } from "../src/services/battle.service.js";

function assertDomainError(action, status, code) {
  assert.throws(action, (error) => {
    assert.equal(error.status, status);
    assert.equal(error.code, code);
    return true;
  });
}

describe("createBattleService", () => {
  let battle;
  beforeEach(() => {
    battle = createBattleService();
  });

  describe("create", () => {
    it("crea una partida en estado waiting con id consecutivo", () => {
      const match = battle.create();

      assert.deepEqual(match, { id: 1, status: "waiting", maxPlayers: 4, inventoryCapacity: 3, winner: null, players: [] });
      assert.equal(battle.create().id, 2);
    });

    it("acepta maxPlayers e inventoryCapacity personalizados", () => {
      assert.equal(battle.create({ maxPlayers: 2, inventoryCapacity: 1 }).maxPlayers, 2);
    });

    for (const [label, options] of [
      ["maxPlayers menor a 2", { maxPlayers: 1 }],
      ["maxPlayers decimal", { maxPlayers: 2.5 }],
      ["inventoryCapacity menor a 1", { inventoryCapacity: 0 }],
    ]) {
      it(`400 INVALID_INPUT con ${label}`, () => assertDomainError(() => battle.create(options), 400, "INVALID_INPUT"));
    }
  });

  describe("join", () => {
    it("agrega un jugador con id propio dentro de la partida", () => {
      const match = battle.create();
      const updated = battle.join(match.id, { name: "Ana" });

      assert.deepEqual(updated.players, [{ id: 1, name: "Ana", alive: true, inventory: [] }]);
    });

    it("400 INVALID_INPUT si el nombre falta o es muy corto", () => {
      const match = battle.create();
      assertDomainError(() => battle.join(match.id, {}), 400, "INVALID_INPUT");
      assertDomainError(() => battle.join(match.id, { name: "A" }), 400, "INVALID_INPUT");
    });

    it("404 MATCH_NOT_FOUND si la partida no existe", () => assertDomainError(() => battle.join(999, { name: "Ana" }), 404, "MATCH_NOT_FOUND"));

    it("409 MATCH_FULL al superar el maximo de jugadores", () => {
      const match = battle.create({ maxPlayers: 2 });
      battle.join(match.id, { name: "Ana" });
      battle.join(match.id, { name: "Beto" });

      assertDomainError(() => battle.join(match.id, { name: "Caro" }), 409, "MATCH_FULL");
    });

    it("409 MATCH_ALREADY_STARTED si la partida ya inicio", () => {
      const match = battle.create();
      battle.join(match.id, { name: "Ana" });
      battle.join(match.id, { name: "Beto" });
      battle.start(match.id);

      assertDomainError(() => battle.join(match.id, { name: "Caro" }), 409, "MATCH_ALREADY_STARTED");
    });
  });

  describe("start", () => {
    it("pasa la partida a active", () => {
      const match = battle.create();
      battle.join(match.id, { name: "Ana" });
      battle.join(match.id, { name: "Beto" });

      assert.equal(battle.start(match.id).status, "active");
    });

    it("409 NOT_ENOUGH_PLAYERS con menos de 2 jugadores", () => {
      const match = battle.create();
      battle.join(match.id, { name: "Ana" });

      assertDomainError(() => battle.start(match.id), 409, "NOT_ENOUGH_PLAYERS");
    });

    it("409 MATCH_ALREADY_STARTED si ya estaba activa", () => {
      const match = battle.create();
      battle.join(match.id, { name: "Ana" });
      battle.join(match.id, { name: "Beto" });
      battle.start(match.id);

      assertDomainError(() => battle.start(match.id), 409, "MATCH_ALREADY_STARTED");
    });

    it("404 MATCH_NOT_FOUND si la partida no existe", () => assertDomainError(() => battle.start(999), 404, "MATCH_NOT_FOUND"));
  });

  describe("eliminate", () => {
    function activeMatchWith3() {
      const match = battle.create({ maxPlayers: 3 });
      battle.join(match.id, { name: "Ana" });
      battle.join(match.id, { name: "Beto" });
      battle.join(match.id, { name: "Caro" });
      battle.start(match.id);
      return match.id;
    }

    it("marca al jugador como eliminado", () => {
      const matchId = activeMatchWith3();
      const updated = battle.eliminate(matchId, 1);

      assert.equal(updated.players.find((p) => p.id === 1).alive, false);
      assert.equal(updated.status, "active");
      assert.equal(updated.winner, null);
    });

    it("al quedar un unico sobreviviente, la partida termina y define un ganador", () => {
      const matchId = activeMatchWith3();
      battle.eliminate(matchId, 1);
      const updated = battle.eliminate(matchId, 2);

      assert.equal(updated.status, "finished");
      assert.equal(updated.winner, 3);
    });

    it("409 PLAYER_ELIMINATED si ya estaba eliminado", () => {
      const matchId = activeMatchWith3();
      battle.eliminate(matchId, 1);

      assertDomainError(() => battle.eliminate(matchId, 1), 409, "PLAYER_ELIMINATED");
    });

    it("404 PLAYER_NOT_FOUND si el jugador no existe en la partida", () => {
      const matchId = activeMatchWith3();
      assertDomainError(() => battle.eliminate(matchId, 999), 404, "PLAYER_NOT_FOUND");
    });

    it("409 MATCH_NOT_ACTIVE si la partida no ha iniciado", () => {
      const match = battle.create();
      battle.join(match.id, { name: "Ana" });

      assertDomainError(() => battle.eliminate(match.id, 1), 409, "MATCH_NOT_ACTIVE");
    });

    it("409 MATCH_NOT_ACTIVE si la partida ya termino", () => {
      const matchId = activeMatchWith3();
      battle.eliminate(matchId, 1);
      battle.eliminate(matchId, 2);

      assertDomainError(() => battle.eliminate(matchId, 3), 409, "MATCH_NOT_ACTIVE");
    });
  });

  describe("loot", () => {
    function activeMatch(inventoryCapacity = 3) {
      const match = battle.create({ inventoryCapacity });
      battle.join(match.id, { name: "Ana" });
      battle.join(match.id, { name: "Beto" });
      battle.start(match.id);
      return match.id;
    }

    function activeMatchWith3() {
      const match = battle.create({ maxPlayers: 3 });
      battle.join(match.id, { name: "Ana" });
      battle.join(match.id, { name: "Beto" });
      battle.join(match.id, { name: "Caro" });
      battle.start(match.id);
      return match.id;
    }

    it("agrega un objeto al inventario del jugador", () => {
      const matchId = activeMatch();
      const updated = battle.loot(matchId, 1, { item: "botiquin" });

      assert.deepEqual(updated.players.find((p) => p.id === 1).inventory, ["botiquin"]);
    });

    it("400 INVALID_INPUT si el item falta o es muy corto", () => {
      const matchId = activeMatch();
      assertDomainError(() => battle.loot(matchId, 1, {}), 400, "INVALID_INPUT");
      assertDomainError(() => battle.loot(matchId, 1, { item: "a" }), 400, "INVALID_INPUT");
    });

    it("409 INVENTORY_FULL al superar la capacidad", () => {
      const matchId = activeMatch(1);
      battle.loot(matchId, 1, { item: "botiquin" });

      assertDomainError(() => battle.loot(matchId, 1, { item: "escudo" }), 409, "INVENTORY_FULL");
    });

    it("409 PLAYER_ELIMINATED si el jugador ya fue eliminado", () => {
      const matchId = activeMatchWith3();
      battle.eliminate(matchId, 1);

      assertDomainError(() => battle.loot(matchId, 1, { item: "botiquin" }), 409, "PLAYER_ELIMINATED");
    });

    it("409 MATCH_NOT_ACTIVE si la partida no esta activa", () => {
      const match = battle.create();
      battle.join(match.id, { name: "Ana" });

      assertDomainError(() => battle.loot(match.id, 1, { item: "botiquin" }), 409, "MATCH_NOT_ACTIVE");
    });
  });

  describe("getById", () => {
    it("devuelve una copia defensiva, no el objeto interno", () => {
      const match = battle.create();
      battle.join(match.id, { name: "Ana" });

      const view = battle.getById(match.id);
      view.players[0].name = "hackeado";

      assert.equal(battle.getById(match.id).players[0].name, "Ana");
    });

    it("404 MATCH_NOT_FOUND si no existe", () => assertDomainError(() => battle.getById(999), 404, "MATCH_NOT_FOUND"));
  });
});
