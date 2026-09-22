import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createChampionsService } from "../src/services/champions.service.js";

const abilities = { passive: "Fuego interior", q: "Bola de fuego", w: "Escudo de fenix", e: "Combustion", r: "Furia del fenix" };
const validBody = { name: "Kaelthas", role: "medio", difficulty: 5, tags: ["control"], releaseYear: 2015, abilities };

function assertAppError(action, status, code) {
  assert.throws(action, (error) => {
    assert.equal(error.name, "AppError");
    assert.equal(error.status, status);
    assert.equal(error.code, code);
    return true;
  });
}

describe("createChampionsService (solo reglas de negocio; el formato ya llego validado por el schema)", () => {
  let service;
  beforeEach(() => {
    service = createChampionsService();
  });

  it("crea con id consecutivo, sin volver a validar el formato de los campos", () => {
    const champion = service.create(validBody);

    assert.deepEqual(champion, { id: 1, ...validBody });
    assert.equal(service.create({ ...validBody, name: "Otro" }).id, 2);
  });

  it("409 NAME_TAKEN con un nombre repetido, sin importar mayusculas ni acentos", () => {
    service.create(validBody);

    for (const name of ["Kaelthas", "kaelthas", "KAELTHAS", "  Kaelthas  ", "Kaélthas"]) {
      assert.throws(() => service.create({ ...validBody, name }), (error) => error.code === "NAME_TAKEN");
    }
    assert.equal(service.list().length, 1);
  });

  it("list filtra por role y por minDifficulty", () => {
    service.create({ ...validBody, name: "A", role: "top", difficulty: 3 });
    service.create({ ...validBody, name: "B", role: "top", difficulty: 8 });
    service.create({ ...validBody, name: "C", role: "adc", difficulty: 8 });

    assert.equal(service.list({ role: "top" }).length, 2);
    assert.equal(service.list({ minDifficulty: 8 }).length, 2);
    assert.equal(service.list({ role: "top", minDifficulty: 8 }).length, 1);
  });

  it("list, getById devuelven copias, no el objeto interno", () => {
    const created = service.create(validBody);
    service.list()[0].name = "hackeado";
    service.getById(created.id).name = "hackeado";

    assert.equal(service.getById(created.id).name, "Kaelthas");
  });

  it("getById de un id inexistente da 404 (el id ya llega como numero valido desde el schema)", () => assertAppError(() => service.getById(999), 404, "NOT_FOUND"));

  describe("update", () => {
    it("aplica un cambio parcial sin tocar los demas campos", () => {
      const created = service.create(validBody);
      const updated = service.update(created.id, { difficulty: 9 });

      assert.equal(updated.difficulty, 9);
      assert.equal(updated.name, "Kaelthas");
    });

    it("409 NAME_TAKEN si el nuevo nombre choca con otro campeon distinto", () => {
      service.create(validBody);
      const other = service.create({ ...validBody, name: "Otro" });

      assert.throws(() => service.update(other.id, { name: "Kaelthas" }), (error) => error.code === "NAME_TAKEN");
    });

    it("permite mantener el propio nombre sin disparar NAME_TAKEN contra si mismo", () => {
      const created = service.create(validBody);

      assert.doesNotThrow(() => service.update(created.id, { name: "Kaelthas", difficulty: 7 }));
    });

    it("404 NOT_FOUND si el campeon no existe", () => assertAppError(() => service.update(999, { difficulty: 5 }), 404, "NOT_FOUND"));
  });

  it("una semilla con nombres repetidos hace fallar la creacion del servicio", () => {
    assert.throws(() => createChampionsService({ seed: [validBody, validBody] }));
  });
});
