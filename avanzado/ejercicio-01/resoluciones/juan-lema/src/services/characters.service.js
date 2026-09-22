import { AppError } from "../errors.js";

const CLASS_BASE = Object.freeze({
  guerrero: { hp: 30, attack: 8, defense: 6 },
  mago: { hp: 15, attack: 12, defense: 2 },
  arquero: { hp: 20, attack: 10, defense: 3 },
  clerigo: { hp: 25, attack: 5, defense: 5 },
});
const CLASSES = Object.freeze(Object.keys(CLASS_BASE));
const ID_PATTERN = /^[1-9]\d*$/;
const MIN_LEVEL = 1;
const MAX_LEVEL = 60;

const invalid = (code, message) => new AppError(400, code, message);

function statsFor(characterClass, level) {
  const base = CLASS_BASE[characterClass];
  return { hp: base.hp + level * 10, attack: base.attack + level * 2, defense: base.defense + level };
}

function createCharactersService({ seed = [] } = {}) {
  const characters = [];
  let nextId = 1;

  function findById(id) {
    if (!ID_PATTERN.test(id)) throw invalid("INVALID_ID", "id debe ser un entero positivo");

    const character = characters.find((c) => c.id === Number(id));
    if (!character) throw new AppError(404, "NOT_FOUND", `Personaje ${id} no encontrado`);
    return character;
  }

  const list = () => characters.map((c) => ({ ...c }));
  const getById = (id) => ({ ...findById(id) });

  function create({ name, characterClass, level } = {}) {
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 30) throw invalid("INVALID_BODY", "name debe tener entre 2 y 30 caracteres");
    if (!CLASSES.includes(characterClass)) throw invalid("INVALID_BODY", `characterClass debe ser una de: ${CLASSES.join(", ")}`);
    if (!Number.isInteger(level) || level < MIN_LEVEL || level > MAX_LEVEL) throw invalid("INVALID_BODY", `level debe ser un entero entre ${MIN_LEVEL} y ${MAX_LEVEL}`);

    const character = { id: nextId++, name: name.trim(), characterClass, level, ...statsFor(characterClass, level) };
    characters.push(character);
    return { ...character };
  }

  seed.forEach(create);
  return { list, getById, create };
}

export { createCharactersService, CLASSES };
