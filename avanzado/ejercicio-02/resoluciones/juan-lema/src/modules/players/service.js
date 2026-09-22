import { AppError } from "../../errors.js";

const ID_PATTERN = /^[1-9]\d*$/;
const invalid = (code, message) => new AppError(400, code, message);

function createPlayersService({ seed = [] } = {}) {
  const players = [];
  let nextId = 1;

  function findById(id) {
    if (!ID_PATTERN.test(id)) throw invalid("INVALID_ID", "id debe ser un entero positivo");

    const player = players.find((p) => p.id === Number(id));
    if (!player) throw new AppError(404, "NOT_FOUND", `Jugador ${id} no encontrado`);
    return player;
  }

  const list = () => players.map((p) => ({ ...p }));
  const getById = (id) => ({ ...findById(id) });
  const exists = (id) => ID_PATTERN.test(String(id)) && players.some((p) => p.id === Number(id));

  function create({ nickname } = {}) {
    if (typeof nickname !== "string" || nickname.trim().length < 2 || nickname.trim().length > 20) throw invalid("INVALID_BODY", "nickname debe tener entre 2 y 20 caracteres");

    const player = { id: nextId++, nickname: nickname.trim(), kills: 0 };
    players.push(player);
    return { ...player };
  }

  seed.forEach(create);
  return { list, getById, exists, create };
}

export { createPlayersService };
