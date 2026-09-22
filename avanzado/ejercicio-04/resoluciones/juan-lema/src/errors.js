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

class MatchNotFoundError extends DomainError {
  constructor(id) {
    super(404, "MATCH_NOT_FOUND", `Partida ${id} no encontrada`);
  }
}

class PlayerNotFoundError extends DomainError {
  constructor(id) {
    super(404, "PLAYER_NOT_FOUND", `Jugador ${id} no encontrado`);
  }
}

class MatchAlreadyStartedError extends DomainError {
  constructor() {
    super(409, "MATCH_ALREADY_STARTED", "La partida ya comenzo, no se puede unir ni volver a iniciar");
  }
}

class MatchFullError extends DomainError {
  constructor(max) {
    super(409, "MATCH_FULL", `La partida ya tiene el maximo de ${max} jugadores`);
  }
}

class NotEnoughPlayersError extends DomainError {
  constructor() {
    super(409, "NOT_ENOUGH_PLAYERS", "Se necesitan al menos 2 jugadores para iniciar la partida");
  }
}

class MatchNotActiveError extends DomainError {
  constructor() {
    super(409, "MATCH_NOT_ACTIVE", "La partida no esta activa");
  }
}

class PlayerEliminatedError extends DomainError {
  constructor(id) {
    super(409, "PLAYER_ELIMINATED", `El jugador ${id} ya fue eliminado`);
  }
}

class InventoryFullError extends DomainError {
  constructor(id, capacity) {
    super(409, "INVENTORY_FULL", `El inventario del jugador ${id} ya tiene el maximo de ${capacity} objetos`);
  }
}

export {
  DomainError,
  InvalidInputError,
  MatchNotFoundError,
  PlayerNotFoundError,
  MatchAlreadyStartedError,
  MatchFullError,
  NotEnoughPlayersError,
  MatchNotActiveError,
  PlayerEliminatedError,
  InventoryFullError,
};
