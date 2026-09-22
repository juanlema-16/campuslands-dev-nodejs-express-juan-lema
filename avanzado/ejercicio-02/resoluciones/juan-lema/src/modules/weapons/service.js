import { AppError } from "../../errors.js";

const CATEGORIES = Object.freeze(["rifle", "pistola", "francotirador", "escopeta"]);
const ID_PATTERN = /^[1-9]\d*$/;
const invalid = (code, message) => new AppError(400, code, message);

function createWeaponsService({ seed = [] } = {}) {
  const weapons = [];
  let nextId = 1;

  function findById(id) {
    if (!ID_PATTERN.test(id)) throw invalid("INVALID_ID", "id debe ser un entero positivo");

    const weapon = weapons.find((w) => w.id === Number(id));
    if (!weapon) throw new AppError(404, "NOT_FOUND", `Arma ${id} no encontrada`);
    return weapon;
  }

  const list = () => weapons.map((w) => ({ ...w }));
  const getById = (id) => ({ ...findById(id) });
  const exists = (id) => ID_PATTERN.test(String(id)) && weapons.some((w) => w.id === Number(id));

  function create({ name, category } = {}) {
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 30) throw invalid("INVALID_BODY", "name debe tener entre 2 y 30 caracteres");
    if (!CATEGORIES.includes(category)) throw invalid("INVALID_BODY", `category debe ser una de: ${CATEGORIES.join(", ")}`);

    const weapon = { id: nextId++, name: name.trim(), category };
    weapons.push(weapon);
    return { ...weapon };
  }

  seed.forEach(create);
  return { list, getById, exists, create };
}

export { createWeaponsService, CATEGORIES };
