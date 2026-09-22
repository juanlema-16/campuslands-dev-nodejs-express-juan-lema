import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createPlayersService } from "../src/modules/players/index.js";
import { createWeaponsService } from "../src/modules/weapons/index.js";
import { createMatchesService } from "../src/modules/matches/index.js";

function assertAppError(action, status, code) {
  assert.throws(action, (error) => {
    assert.equal(error.name, "AppError");
    assert.equal(error.status, status);
    assert.equal(error.code, code);
    return true;
  });
}

describe("createMatchesService (depende de players y weapons por inyeccion)", () => {
  let players;
  let weapons;
  let matches;
  let p1;
  let p2;
  let w1;

  beforeEach(() => {
    players = createPlayersService();
    weapons = createWeaponsService();
    matches = createMatchesService({ players, weapons });
    p1 = players.create({ nickname: "Viper" }).id;
    p2 = players.create({ nickname: "Ashen" }).id;
    w1 = weapons.create({ name: "Aegis-7", category: "rifle" }).id;
  });

  it("crea la partida validando cada entry contra los modulos inyectados", () => {
    const match = matches.create({ mapName: "Arena Cruce", entries: [{ playerId: p1, weaponId: w1 }, { playerId: p2, weaponId: w1 }] });

    assert.deepEqual(match, { id: 1, mapName: "Arena Cruce", entries: [{ playerId: p1, weaponId: w1 }, { playerId: p2, weaponId: w1 }] });
  });

  it("rechaza un playerId que no existe en el modulo players", () => {
    assertAppError(() => matches.create({ mapName: "Arena Cruce", entries: [{ playerId: 999, weaponId: w1 }, { playerId: p2, weaponId: w1 }] }), 400, "INVALID_BODY");
  });

  it("rechaza un weaponId que no existe en el modulo weapons", () => {
    assertAppError(() => matches.create({ mapName: "Arena Cruce", entries: [{ playerId: p1, weaponId: 999 }, { playerId: p2, weaponId: w1 }] }), 400, "INVALID_BODY");
  });

  it("rechaza playerId repetidos dentro de la misma partida", () => {
    assertAppError(() => matches.create({ mapName: "Arena Cruce", entries: [{ playerId: p1, weaponId: w1 }, { playerId: p1, weaponId: w1 }] }), 400, "INVALID_BODY");
  });

  for (const [label, entries] of [["1 sola entrada", [{ playerId: 1, weaponId: 1 }]], ["no es un arreglo", "x"], ["ausente", undefined]]) {
    it(`rechaza entries: ${label}`, () => assertAppError(() => matches.create({ mapName: "Arena Cruce", entries }), 400, "INVALID_BODY"));
  }

  it("rechaza un mapName invalido", () => assertAppError(() => matches.create({ mapName: "A", entries: [{ playerId: p1, weaponId: w1 }, { playerId: p2, weaponId: w1 }] }), 400, "INVALID_BODY"));

  it("list y getById devuelven copias profundas (entries incluido)", () => {
    const created = matches.create({ mapName: "Arena Cruce", entries: [{ playerId: p1, weaponId: w1 }, { playerId: p2, weaponId: w1 }] });
    matches.list()[0].entries[0].playerId = 999;
    matches.getById(created.id).entries[0].playerId = 999;

    assert.equal(matches.getById(created.id).entries[0].playerId, p1);
  });

  for (const id of ["abc", "0"]) {
    it(`getById rechaza el id ${JSON.stringify(id)}`, () => assertAppError(() => matches.getById(id), 400, "INVALID_ID"));
  }

  it("getById de un id inexistente da 404", () => assertAppError(() => matches.getById(99), 404, "NOT_FOUND"));
});
