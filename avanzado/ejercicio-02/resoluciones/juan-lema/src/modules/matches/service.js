import { AppError } from "../../errors.js";

const ID_PATTERN = /^[1-9]\d*$/;
const MIN_ENTRIES = 2;
const MAX_ENTRIES = 10;
const invalid = (code, message) => new AppError(400, code, message);

function checkEntries(entries, players, weapons) {
  if (!Array.isArray(entries) || entries.length < MIN_ENTRIES || entries.length > MAX_ENTRIES) throw invalid("INVALID_BODY", `entries debe ser un arreglo de ${MIN_ENTRIES} a ${MAX_ENTRIES} elementos`);

  const playerIds = entries.map((entry) => entry?.playerId);
  if (new Set(playerIds).size !== playerIds.length) throw invalid("INVALID_BODY", "entries no puede repetir playerId");

  for (const entry of entries) {
    if (!players.exists(entry?.playerId)) throw invalid("INVALID_BODY", `playerId ${entry?.playerId} no corresponde a un jugador registrado`);
    if (!weapons.exists(entry?.weaponId)) throw invalid("INVALID_BODY", `weaponId ${entry?.weaponId} no corresponde a un arma registrada`);
  }
}

function createMatchesService({ players, weapons, seed = [] } = {}) {
  const matches = [];
  let nextId = 1;

  function findById(id) {
    if (!ID_PATTERN.test(id)) throw invalid("INVALID_ID", "id debe ser un entero positivo");

    const match = matches.find((m) => m.id === Number(id));
    if (!match) throw new AppError(404, "NOT_FOUND", `Partida ${id} no encontrada`);
    return match;
  }

  const clone = (match) => ({ ...match, entries: match.entries.map((entry) => ({ ...entry })) });
  const list = () => matches.map(clone);
  const getById = (id) => clone(findById(id));

  function create({ mapName, entries } = {}) {
    if (typeof mapName !== "string" || mapName.trim().length < 2 || mapName.trim().length > 40) throw invalid("INVALID_BODY", "mapName debe tener entre 2 y 40 caracteres");
    checkEntries(entries, players, weapons);

    const match = { id: nextId++, mapName: mapName.trim(), entries: entries.map(({ playerId, weaponId }) => ({ playerId, weaponId })) };
    matches.push(match);
    return getById(match.id);
  }

  seed.forEach(create);
  return { list, getById, create };
}

export { createMatchesService };
