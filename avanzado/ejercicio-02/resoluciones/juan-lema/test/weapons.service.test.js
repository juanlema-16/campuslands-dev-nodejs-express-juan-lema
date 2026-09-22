import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createWeaponsService, CATEGORIES } from "../src/modules/weapons/index.js";

function assertAppError(action, status, code) {
  assert.throws(action, (error) => {
    assert.equal(error.name, "AppError");
    assert.equal(error.status, status);
    assert.equal(error.code, code);
    return true;
  });
}

describe("createWeaponsService", () => {
  let service;
  beforeEach(() => {
    service = createWeaponsService();
  });

  it("crea con id consecutivo", () => {
    const weapon = service.create({ name: "Aegis-7", category: "rifle" });

    assert.deepEqual(weapon, { id: 1, name: "Aegis-7", category: "rifle" });
    assert.equal(service.create({ name: "Whisper", category: "francotirador" }).id, 2);
  });

  it("cada categoria reconocida es valida", () => {
    for (const category of CATEGORIES) assert.equal(service.create({ name: "Arma", category }).category, category);
  });

  for (const [label, body] of [["name corto", { name: "A", category: "rifle" }], ["categoria desconocida", { name: "Arma", category: "laser" }], ["sin cuerpo", undefined]]) {
    it(`create rechaza: ${label}`, () => assertAppError(() => service.create(body), 400, "INVALID_BODY"));
  }

  it("list y getById devuelven copias, no el objeto interno", () => {
    const created = service.create({ name: "Aegis-7", category: "rifle" });
    service.getById(created.id).name = "hackeado";

    assert.equal(service.getById(created.id).name, "Aegis-7");
  });

  it("exists confirma o descarta un id", () => {
    const created = service.create({ name: "Aegis-7", category: "rifle" });

    assert.equal(service.exists(created.id), true);
    assert.equal(service.exists(999), false);
  });

  for (const id of ["abc", "0", "-1"]) {
    it(`getById rechaza el id ${JSON.stringify(id)}`, () => assertAppError(() => service.getById(id), 400, "INVALID_ID"));
  }

  it("getById de un id inexistente da 404", () => assertAppError(() => service.getById(99), 404, "NOT_FOUND"));
});
