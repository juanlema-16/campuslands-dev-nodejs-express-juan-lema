import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createPlayersService } from "../src/modules/players/index.js";

function assertAppError(action, status, code) {
  assert.throws(action, (error) => {
    assert.equal(error.name, "AppError");
    assert.equal(error.status, status);
    assert.equal(error.code, code);
    return true;
  });
}

describe("createPlayersService", () => {
  let service;
  beforeEach(() => {
    service = createPlayersService();
  });

  it("crea con id consecutivo y kills en 0", () => {
    const player = service.create({ nickname: "Viper" });

    assert.deepEqual(player, { id: 1, nickname: "Viper", kills: 0 });
    assert.equal(service.create({ nickname: "Ashen" }).id, 2);
  });

  it("recorta el nickname", () => {
    assert.equal(service.create({ nickname: "  Viper  " }).nickname, "Viper");
  });

  for (const [label, body] of [["corto", { nickname: "A" }], ["largo", { nickname: "x".repeat(21) }], ["sin cuerpo", undefined]]) {
    it(`create rechaza: ${label}`, () => assertAppError(() => service.create(body), 400, "INVALID_BODY"));
  }

  it("list y getById devuelven copias, no el objeto interno", () => {
    const created = service.create({ nickname: "Viper" });
    service.list()[0].kills = 999;
    service.getById(created.id).kills = 999;

    assert.equal(service.getById(created.id).kills, 0);
  });

  it("exists confirma o descarta un id sin lanzar errores, con cualquier tipo de entrada", () => {
    const created = service.create({ nickname: "Viper" });

    assert.equal(service.exists(created.id), true);
    assert.equal(service.exists(999), false);
    assert.equal(service.exists("abc"), false);
    assert.equal(service.exists(undefined), false);
  });

  it("exists rechaza un id con cero inicial aunque numericamente coincida con uno real (id 1 vs '01')", () => {
    service.create({ nickname: "Viper" });

    assert.equal(service.exists("01"), false);
  });

  for (const id of ["abc", "0", "-1"]) {
    it(`getById rechaza el id ${JSON.stringify(id)}`, () => assertAppError(() => service.getById(id), 400, "INVALID_ID"));
  }

  it("getById de un id inexistente da 404", () => assertAppError(() => service.getById(99), 404, "NOT_FOUND"));
});
