import {
  InvalidInputError,
  MatchNotFoundError,
  PlayerNotFoundError,
  MatchAlreadyStartedError,
  MatchFullError,
  NotEnoughPlayersError,
  MatchNotActiveError,
  PlayerEliminatedError,
  InventoryFullError,
} from "../errors.js";

function toView(match) {
  return {
    id: match.id,
    status: match.status,
    maxPlayers: match.maxPlayers,
    inventoryCapacity: match.inventoryCapacity,
    winner: match.winner,
    players: match.players.map((p) => ({ id: p.id, name: p.name, alive: p.alive, inventory: [...p.inventory] })),
  };
}

function createBattleService() {
  const matches = [];
  let nextMatchId = 1;

  function findMatch(id) {
    const match = matches.find((m) => m.id === Number(id));
    if (!match) throw new MatchNotFoundError(id);
    return match;
  }

  function findPlayer(match, playerId) {
    const player = match.players.find((p) => p.id === Number(playerId));
    if (!player) throw new PlayerNotFoundError(playerId);
    return player;
  }

  function create({ maxPlayers = 4, inventoryCapacity = 3 } = {}) {
    if (!Number.isInteger(maxPlayers) || maxPlayers < 2) throw new InvalidInputError("maxPlayers debe ser un entero mayor o igual a 2");
    if (!Number.isInteger(inventoryCapacity) || inventoryCapacity < 1) throw new InvalidInputError("inventoryCapacity debe ser un entero mayor o igual a 1");

    const match = { id: nextMatchId++, status: "waiting", maxPlayers, inventoryCapacity, players: [], winner: null, nextPlayerId: 1 };
    matches.push(match);
    return toView(match);
  }

  function join(matchId, { name } = {}) {
    if (typeof name !== "string" || name.trim().length < 2) throw new InvalidInputError("name debe tener al menos 2 caracteres");

    const match = findMatch(matchId);
    if (match.status !== "waiting") throw new MatchAlreadyStartedError();
    if (match.players.length >= match.maxPlayers) throw new MatchFullError(match.maxPlayers);

    match.players.push({ id: match.nextPlayerId++, name: name.trim(), alive: true, inventory: [] });
    return toView(match);
  }

  function start(matchId) {
    const match = findMatch(matchId);
    if (match.status !== "waiting") throw new MatchAlreadyStartedError();
    if (match.players.length < 2) throw new NotEnoughPlayersError();

    match.status = "active";
    return toView(match);
  }

  function eliminate(matchId, playerId) {
    const match = findMatch(matchId);
    if (match.status !== "active") throw new MatchNotActiveError();
    const player = findPlayer(match, playerId);
    if (!player.alive) throw new PlayerEliminatedError(playerId);

    player.alive = false;
    const survivors = match.players.filter((p) => p.alive);
    if (survivors.length === 1) {
      match.status = "finished";
      match.winner = survivors[0].id;
    }
    return toView(match);
  }

  function loot(matchId, playerId, { item } = {}) {
    if (typeof item !== "string" || item.trim().length < 2) throw new InvalidInputError("item debe tener al menos 2 caracteres");

    const match = findMatch(matchId);
    if (match.status !== "active") throw new MatchNotActiveError();
    const player = findPlayer(match, playerId);
    if (!player.alive) throw new PlayerEliminatedError(playerId);
    if (player.inventory.length >= match.inventoryCapacity) throw new InventoryFullError(playerId, match.inventoryCapacity);

    player.inventory.push(item.trim());
    return toView(match);
  }

  const getById = (id) => toView(findMatch(id));

  return { create, join, start, eliminate, loot, getById };
}

export { createBattleService };
