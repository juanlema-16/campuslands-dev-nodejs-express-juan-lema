class DomainError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
  }
}

class InvalidInputError extends DomainError {
  constructor(message) {
    super(400, "INVALID_INPUT", message);
  }
}

class ClubNotFoundError extends DomainError {
  constructor(id) {
    super(404, "CLUB_NOT_FOUND", `Club ${id} no encontrado`);
  }
}

class PlayerNotFoundError extends DomainError {
  constructor(id) {
    super(404, "PLAYER_NOT_FOUND", `Jugador ${id} no encontrado`);
  }
}

class SameClubError extends DomainError {
  constructor() {
    super(409, "SAME_CLUB", "El jugador ya pertenece al club destino");
  }
}

class InsufficientBudgetError extends DomainError {
  constructor(clubId, fee, budget) {
    super(409, "INSUFFICIENT_BUDGET", `El club ${clubId} tiene ${budget} de presupuesto y no alcanza para pagar la cuota de ${fee}`);
  }
}

class SquadFullError extends DomainError {
  constructor(clubId, max) {
    super(409, "SQUAD_FULL", `El club ${clubId} ya tiene el maximo de ${max} jugadores`);
  }
}

export { DomainError, InvalidInputError, ClubNotFoundError, PlayerNotFoundError, SameClubError, InsufficientBudgetError, SquadFullError };
