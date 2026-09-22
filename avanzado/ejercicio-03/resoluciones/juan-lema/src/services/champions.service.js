import { AppError } from "../errors.js";

const nameKey = (name) => name.trim().normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

function createChampionsService({ seed = [] } = {}) {
  const champions = [];
  let nextId = 1;

  function findById(id) {
    const champion = champions.find((c) => c.id === id);
    if (!champion) throw new AppError(404, "NOT_FOUND", `Campeon ${id} no encontrado`);
    return champion;
  }

  function ensureNameFree(name, exceptId) {
    const existing = champions.find((c) => c.id !== exceptId && nameKey(c.name) === nameKey(name));
    if (existing) throw new AppError(409, "NAME_TAKEN", `Ya existe un campeon llamado "${existing.name}" (id ${existing.id})`);
  }

  function list({ role, minDifficulty } = {}) {
    return champions.filter((c) => (role === undefined || c.role === role) && (minDifficulty === undefined || c.difficulty >= minDifficulty)).map((c) => ({ ...c }));
  }

  const getById = (id) => ({ ...findById(id) });

  function create(body) {
    ensureNameFree(body.name);

    const champion = { id: nextId++, ...body };
    champions.push(champion);
    return { ...champion };
  }

  function update(id, patch) {
    const champion = findById(id);
    if (patch.name !== undefined) ensureNameFree(patch.name, id);

    Object.assign(champion, patch);
    return { ...champion };
  }

  seed.forEach(create);
  return { list, getById, create, update };
}

export { createChampionsService };
