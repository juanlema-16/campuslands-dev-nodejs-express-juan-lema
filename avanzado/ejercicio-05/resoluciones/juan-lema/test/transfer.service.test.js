import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTransferService } from "../src/services/transfer.service.js";

function assertDomainError(action, status, code) {
  assert.throws(action, (error) => {
    assert.equal(error.status, status);
    assert.equal(error.code, code);
    return true;
  });
}

describe("createTransferService", () => {
  let transfers;
  beforeEach(() => {
    transfers = createTransferService();
  });

  describe("createClub", () => {
    it("crea un club con id consecutivo", () => {
      const club = transfers.createClub({ name: "River", budget: 1000, maxSquadSize: 2 });

      assert.deepEqual(club, { id: 1, name: "River", budget: 1000, maxSquadSize: 2 });
      assert.equal(transfers.createClub({ name: "Boca" }).id, 2);
    });

    it("usa budget 0 y maxSquadSize 25 por defecto", () => {
      const club = transfers.createClub({ name: "River" });
      assert.equal(club.budget, 0);
      assert.equal(club.maxSquadSize, 25);
    });

    for (const [label, options] of [
      ["name corto", { name: "A" }],
      ["budget negativo", { name: "River", budget: -1 }],
      ["budget decimal", { name: "River", budget: 1.5 }],
      ["maxSquadSize menor a 1", { name: "River", maxSquadSize: 0 }],
    ]) {
      it(`400 INVALID_INPUT con ${label}`, () => assertDomainError(() => transfers.createClub(options), 400, "INVALID_INPUT"));
    }
  });

  describe("createPlayer", () => {
    it("agrega un jugador a un club existente", () => {
      const club = transfers.createClub({ name: "River" });
      const player = transfers.createPlayer({ name: "Messi", clubId: club.id });

      assert.deepEqual(player, { id: 1, name: "Messi", clubId: club.id });
    });

    it("400 INVALID_INPUT con un nombre invalido", () => {
      const club = transfers.createClub({ name: "River" });
      assertDomainError(() => transfers.createPlayer({ clubId: club.id }), 400, "INVALID_INPUT");
    });

    it("404 CLUB_NOT_FOUND si el club no existe", () => assertDomainError(() => transfers.createPlayer({ name: "Messi", clubId: 999 }), 404, "CLUB_NOT_FOUND"));

    it("409 SQUAD_FULL al superar el maximo del club", () => {
      const club = transfers.createClub({ name: "River", maxSquadSize: 1 });
      transfers.createPlayer({ name: "Messi", clubId: club.id });

      assertDomainError(() => transfers.createPlayer({ name: "Otro", clubId: club.id }), 409, "SQUAD_FULL");
    });
  });

  describe("transfer (transaccion simulada)", () => {
    it("mueve al jugador y ajusta los presupuestos de ambos clubes", () => {
      const from = transfers.createClub({ name: "River", budget: 0 });
      const to = transfers.createClub({ name: "Boca", budget: 1000 });
      const player = transfers.createPlayer({ name: "Messi", clubId: from.id });

      const record = transfers.transfer({ playerId: player.id, toClubId: to.id, fee: 300 });

      assert.deepEqual(record, { id: 1, playerId: player.id, fromClubId: from.id, toClubId: to.id, fee: 300 });
      assert.equal(transfers.getClub(from.id).budget, 300);
      assert.equal(transfers.getClub(to.id).budget, 700);
      assert.equal(transfers.listPlayers().find((p) => p.id === player.id).clubId, to.id);
      assert.deepEqual(transfers.listTransfers(), [record]);
    });

    it("400 INVALID_INPUT con un fee invalido, antes de tocar ningun club", () => {
      const from = transfers.createClub({ name: "River" });
      const to = transfers.createClub({ name: "Boca", budget: 1000 });
      const player = transfers.createPlayer({ name: "Messi", clubId: from.id });

      assertDomainError(() => transfers.transfer({ playerId: player.id, toClubId: to.id, fee: -1 }), 400, "INVALID_INPUT");
    });

    it("404 PLAYER_NOT_FOUND si el jugador no existe", () => {
      const to = transfers.createClub({ name: "Boca", budget: 1000 });
      assertDomainError(() => transfers.transfer({ playerId: 999, toClubId: to.id, fee: 100 }), 404, "PLAYER_NOT_FOUND");
    });

    it("404 CLUB_NOT_FOUND si el club destino no existe", () => {
      const from = transfers.createClub({ name: "River" });
      const player = transfers.createPlayer({ name: "Messi", clubId: from.id });

      assertDomainError(() => transfers.transfer({ playerId: player.id, toClubId: 999, fee: 100 }), 404, "CLUB_NOT_FOUND");
    });

    it("409 SAME_CLUB si el destino es el mismo club actual", () => {
      const from = transfers.createClub({ name: "River" });
      const player = transfers.createPlayer({ name: "Messi", clubId: from.id });

      assertDomainError(() => transfers.transfer({ playerId: player.id, toClubId: from.id, fee: 0 }), 409, "SAME_CLUB");
    });

    it("409 INSUFFICIENT_BUDGET si el club destino no puede pagar, y no cambia ningun estado (rollback)", () => {
      const from = transfers.createClub({ name: "River", budget: 0 });
      const to = transfers.createClub({ name: "Boca", budget: 100 });
      const player = transfers.createPlayer({ name: "Messi", clubId: from.id });

      assertDomainError(() => transfers.transfer({ playerId: player.id, toClubId: to.id, fee: 300 }), 409, "INSUFFICIENT_BUDGET");

      assert.equal(transfers.getClub(from.id).budget, 0);
      assert.equal(transfers.getClub(to.id).budget, 100);
      assert.equal(transfers.listPlayers().find((p) => p.id === player.id).clubId, from.id);
      assert.deepEqual(transfers.listTransfers(), []);
    });

    it("409 SQUAD_FULL cuando el cupo se agota justo despues de mover el dinero, y deshace ambos presupuestos (rollback real)", () => {
      const from = transfers.createClub({ name: "River", budget: 0 });
      const to = transfers.createClub({ name: "Boca", budget: 1000, maxSquadSize: 1 });
      transfers.createPlayer({ name: "Ya en Boca", clubId: to.id });
      const player = transfers.createPlayer({ name: "Messi", clubId: from.id });

      assertDomainError(() => transfers.transfer({ playerId: player.id, toClubId: to.id, fee: 300 }), 409, "SQUAD_FULL");

      assert.equal(transfers.getClub(from.id).budget, 0, "el dinero acreditado al vendedor debe revertirse");
      assert.equal(transfers.getClub(to.id).budget, 1000, "el dinero debitado al comprador debe revertirse");
      assert.equal(transfers.listPlayers().find((p) => p.id === player.id).clubId, from.id, "el jugador no debe moverse");
      assert.deepEqual(transfers.listTransfers(), [], "no debe quedar un registro de una transferencia fallida");
    });
  });

  describe("getClub", () => {
    it("404 CLUB_NOT_FOUND si no existe", () => assertDomainError(() => transfers.getClub(999), 404, "CLUB_NOT_FOUND"));

    it("devuelve una copia defensiva, no el objeto interno", () => {
      const club = transfers.createClub({ name: "River" });
      transfers.getClub(club.id).name = "hackeado";

      assert.equal(transfers.getClub(club.id).name, "River");
    });
  });
});
