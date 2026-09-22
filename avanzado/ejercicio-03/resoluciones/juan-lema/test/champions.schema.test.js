import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { championBodySchema, championUpdateSchema, championQuerySchema, idParamSchema } from "../src/schemas/champions.schema.js";

const validAbilities = { passive: "Fuego interior", q: "Bola de fuego", w: "Escudo de fenix", e: "Combustion", r: "Furia del fenix" };
const validChampion = { name: "Kaelthas", role: "medio", difficulty: 5, tags: ["control", "dano"], releaseYear: 2015, abilities: validAbilities };

describe("championBodySchema", () => {
  it("acepta un campeon valido y no altera los valores ya validos", () => {
    const result = championBodySchema.safeParse(validChampion);

    assert.equal(result.success, true);
    assert.deepEqual(result.data, validChampion);
  });

  it("recorta name y cada texto de abilities (trim automatico del schema)", () => {
    const result = championBodySchema.safeParse({ ...validChampion, name: "  Kaelthas  ", abilities: { ...validAbilities, q: "  Bola de fuego  " } });

    assert.equal(result.data.name, "Kaelthas");
    assert.equal(result.data.abilities.q, "Bola de fuego");
  });

  for (const [label, overrides] of [
    ["name corto", { name: "A" }],
    ["role desconocido", { role: "bardo" }],
    ["difficulty fuera de rango", { difficulty: 11 }],
    ["difficulty decimal", { difficulty: 5.5 }],
    ["releaseYear muy antiguo", { releaseYear: 1999 }],
    ["releaseYear futuro", { releaseYear: new Date().getFullYear() + 1 }],
    ["tags vacio", { tags: [] }],
    ["tags con valor desconocido", { tags: ["volador"] }],
  ]) {
    it(`rechaza: ${label}`, () => assert.equal(championBodySchema.safeParse({ ...validChampion, ...overrides }).success, false));
  }

  it("rechaza tags repetidos (regla que un tipo simple no puede expresar, por eso usa .refine)", () => {
    const result = championBodySchema.safeParse({ ...validChampion, tags: ["control", "control"] });

    assert.equal(result.success, false);
    assert.match(result.error.issues[0].message, /repetidos/);
  });

  it("rechaza abilities incompleto (falta una habilidad)", () => {
    const { r, ...incomplete } = validAbilities;
    assert.equal(championBodySchema.safeParse({ ...validChampion, abilities: incomplete }).success, false);
  });

  it("rechaza campos fuera del schema (mass assignment), como id o un typo", () => {
    assert.equal(championBodySchema.safeParse({ ...validChampion, id: 999 }).success, false);
    assert.equal(championBodySchema.safeParse({ ...validChampion, roll: "medio" }).success, false);
  });

  it("reporta TODOS los campos invalidos a la vez, no solo el primero", () => {
    const result = championBodySchema.safeParse({ name: "A", role: "bardo", difficulty: 99, tags: [], releaseYear: 1, abilities: {} });

    const paths = result.error.issues.map((i) => i.path[0]);
    assert.deepEqual(new Set(paths), new Set(["name", "role", "difficulty", "tags", "releaseYear", "abilities"]));
  });
});

describe("championUpdateSchema", () => {
  it("acepta un subconjunto de campos (partial)", () => {
    assert.equal(championUpdateSchema.safeParse({ difficulty: 3 }).success, true);
    assert.equal(championUpdateSchema.safeParse({ tags: ["tanque"] }).success, true);
  });

  it("rechaza un objeto vacio (no tiene sentido actualizar nada)", () => {
    const result = championUpdateSchema.safeParse({});

    assert.equal(result.success, false);
    assert.match(result.error.issues[0].message, /al menos un campo/);
  });

  it("un campo presente sigue validandose con las mismas reglas que en la creacion", () => {
    assert.equal(championUpdateSchema.safeParse({ difficulty: 99 }).success, false);
  });
});

describe("championQuerySchema", () => {
  it("acepta sin filtros", () => {
    assert.deepEqual(championQuerySchema.safeParse({}).data, {});
  });

  it("coerciona minDifficulty de string (query real) a numero", () => {
    const result = championQuerySchema.safeParse({ minDifficulty: "7" });

    assert.equal(result.success, true);
    assert.equal(result.data.minDifficulty, 7);
    assert.equal(typeof result.data.minDifficulty, "number");
  });

  it("rechaza un role desconocido y un parametro no declarado", () => {
    assert.equal(championQuerySchema.safeParse({ role: "bardo" }).success, false);
    assert.equal(championQuerySchema.safeParse({ rol: "medio" }).success, false);
  });
});

describe("idParamSchema", () => {
  it("coerciona un id de string a numero entero", () => {
    const result = idParamSchema.safeParse({ id: "42" });

    assert.equal(result.data.id, 42);
    assert.equal(typeof result.data.id, "number");
  });

  for (const id of ["abc", "-1", "0", "1.5"]) {
    it(`rechaza id invalido: "${id}"`, () => assert.equal(idParamSchema.safeParse({ id }).success, false));
  }
});
