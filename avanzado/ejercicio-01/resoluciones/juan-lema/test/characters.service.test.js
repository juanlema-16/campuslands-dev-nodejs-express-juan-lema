import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createCharactersService, CLASSES } from "../src/services/characters.service.js";

const validBody = { name: "Arden", characterClass: "guerrero", level: 5 };

function assertAppError(action, status, code) {
  assert.throws(action, (error) => {
    assert.equal(error.name, "AppError");
    assert.equal(error.status, status);
    assert.equal(error.code, code);
    return true;
  });
}

describe("createCharactersService", () => {
  let service;
  beforeEach(() => {
    service = createCharactersService();
  });

  it("crea con id consecutivo y calcula stats a partir de clase y nivel", () => {
    const character = service.create(validBody);

    assert.deepEqual(character, { id: 1, name: "Arden", characterClass: "guerrero", level: 5, hp: 80, attack: 18, defense: 11 });
    assert.equal(service.create(validBody).id, 2);
  });

  it("recorta el nombre", () => {
    assert.equal(service.create({ ...validBody, name: "  Arden  " }).name, "Arden");
  });

  it("a mayor nivel, siempre mayores stats (dentro de la misma clase)", () => {
    let previous = service.create({ ...validBody, level: 1 });

    for (let level = 2; level <= 60; level++) {
      const current = service.create({ ...validBody, level });
      assert.ok(current.hp > previous.hp && current.attack > previous.attack && current.defense > previous.defense);
      previous = current;
    }
  });

  it("cada clase reconocida produce stats distintas para el mismo nivel", () => {
    const stats = CLASSES.map((characterClass) => service.create({ ...validBody, characterClass }));
    const uniqueCombos = new Set(stats.map((s) => `${s.hp}-${s.attack}-${s.defense}`));

    assert.equal(uniqueCombos.size, CLASSES.length);
  });

  for (const [label, body] of [
    ["name corto", { ...validBody, name: "A" }],
    ["name largo", { ...validBody, name: "x".repeat(31) }],
    ["sin name", { characterClass: "guerrero", level: 5 }],
    ["clase desconocida", { ...validBody, characterClass: "bardo" }],
    ["level 0", { ...validBody, level: 0 }],
    ["level 61", { ...validBody, level: 61 }],
    ["level decimal", { ...validBody, level: 5.5 }],
    ["level como texto", { ...validBody, level: "5" }],
    ["sin cuerpo", undefined],
  ]) {
    it(`create rechaza: ${label}`, () => assertAppError(() => service.create(body), 400, "INVALID_BODY"));
  }

  it("list y getById devuelven copias, no el objeto interno", () => {
    const created = service.create(validBody);
    service.list()[0].level = 999;
    service.getById(created.id).level = 999;

    assert.equal(service.getById(created.id).level, 5);
  });

  for (const id of ["abc", "0", "-1", "1.5"]) {
    it(`getById rechaza el id ${JSON.stringify(id)}`, () => assertAppError(() => service.getById(id), 400, "INVALID_ID"));
  }

  it("getById de un id inexistente da 404", () => {
    assertAppError(() => service.getById(99), 404, "NOT_FOUND");
  });

  it("una semilla invalida hace fallar la creacion del servicio", () => {
    assert.throws(() => createCharactersService({ seed: [{ ...validBody, characterClass: "bardo" }] }));
  });
});
