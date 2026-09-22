import { runTransaction } from "../utils/transaction.js";
import { InvalidInputError, ClubNotFoundError, PlayerNotFoundError, SameClubError, InsufficientBudgetError, SquadFullError } from "../errors.js";

function createTransferService() {
  const clubs = [];
  const players = [];
  const ledger = [];
  let nextClubId = 1;
  let nextPlayerId = 1;
  let nextTransferId = 1;

  function findClub(id) {
    const club = clubs.find((c) => c.id === Number(id));
    if (!club) throw new ClubNotFoundError(id);
    return club;
  }

  function findPlayer(id) {
    const player = players.find((p) => p.id === Number(id));
    if (!player) throw new PlayerNotFoundError(id);
    return player;
  }

  const squadSize = (clubId) => players.filter((p) => p.clubId === clubId).length;

  function createClub({ name, budget = 0, maxSquadSize = 25 } = {}) {
    if (typeof name !== "string" || name.trim().length < 2) throw new InvalidInputError("name debe tener al menos 2 caracteres");
    if (!Number.isInteger(budget) || budget < 0) throw new InvalidInputError("budget debe ser un entero mayor o igual a 0");
    if (!Number.isInteger(maxSquadSize) || maxSquadSize < 1) throw new InvalidInputError("maxSquadSize debe ser un entero mayor o igual a 1");

    const club = { id: nextClubId++, name: name.trim(), budget, maxSquadSize };
    clubs.push(club);
    return { ...club };
  }

  function createPlayer({ name, clubId } = {}) {
    if (typeof name !== "string" || name.trim().length < 2) throw new InvalidInputError("name debe tener al menos 2 caracteres");
    const club = findClub(clubId);
    if (squadSize(club.id) >= club.maxSquadSize) throw new SquadFullError(club.id, club.maxSquadSize);

    const player = { id: nextPlayerId++, name: name.trim(), clubId: club.id };
    players.push(player);
    return { ...player };
  }

  function transfer({ playerId, toClubId, fee } = {}) {
    if (!Number.isInteger(fee) || fee < 0) throw new InvalidInputError("fee debe ser un entero mayor o igual a 0");

    const player = findPlayer(playerId);
    const toClub = findClub(toClubId);
    const fromClub = findClub(player.clubId);
    if (fromClub.id === toClub.id) throw new SameClubError();

    runTransaction([
      {
        run: () => {
          if (toClub.budget < fee) throw new InsufficientBudgetError(toClub.id, fee, toClub.budget);
          toClub.budget -= fee;
        },
        undo: () => {
          toClub.budget += fee;
        },
      },
      {
        run: () => {
          fromClub.budget += fee;
        },
        undo: () => {
          fromClub.budget -= fee;
        },
      },
      {
        run: () => {
          if (squadSize(toClub.id) >= toClub.maxSquadSize) throw new SquadFullError(toClub.id, toClub.maxSquadSize);
          player.clubId = toClub.id;
        },
      },
    ]);

    const record = { id: nextTransferId++, playerId: player.id, fromClubId: fromClub.id, toClubId: toClub.id, fee };
    ledger.push(record);
    return { ...record };
  }

  const listClubs = () => clubs.map((c) => ({ ...c }));
  const listPlayers = () => players.map((p) => ({ ...p }));
  const listTransfers = () => ledger.map((t) => ({ ...t }));
  const getClub = (id) => ({ ...findClub(id) });

  return { createClub, createPlayer, transfer, listClubs, listPlayers, listTransfers, getClub };
}

export { createTransferService };
