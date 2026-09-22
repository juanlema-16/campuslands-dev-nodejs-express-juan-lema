# Ejercicio 04 (avanzado) — Errores de dominio

API de partidas de battle royale. El punto del ejercicio es modelar las reglas de negocio como una **jerarquía de errores de dominio** (`DomainError` y subclases), en vez de usar un único error genérico parametrizado o responder siempre 200/500.

## Diseño

- `src/errors.js` define `DomainError` (status + code + message) y una subclase por cada regla de negocio violable: `MatchNotFoundError`, `PlayerNotFoundError`, `MatchAlreadyStartedError`, `MatchFullError`, `NotEnoughPlayersError`, `MatchNotActiveError`, `PlayerEliminatedError`, `InventoryFullError`, más `InvalidInputError` para entrada mínima inválida (nombre/objeto faltante). Cada clase encapsula su propio status HTTP y código, así el service solo dice **qué** regla se violó, no cómo se traduce a HTTP.
- `src/middlewares/error-handler.js` solo necesita un `instanceof DomainError` para responder correctamente; no conoce las reglas de negocio, solo el contrato común.
- `src/services/battle.service.js` concentra toda la lógica: cupo máximo, mínimo de jugadores para iniciar, estados de partida (`waiting` → `active` → `finished`), jugadores eliminados no pueden volver a actuar, inventario con capacidad limitada, y detección automática de ganador cuando queda un único sobreviviente.
- Los controllers no usan `try/catch`: los errores de dominio se lanzan de forma síncrona y Express 5 los reenvía automáticamente al `errorHandler`.

## Reglas de negocio (errores de dominio)

| Código               | HTTP | Cuándo ocurre                                              |
| -------------------- | ---- | ------------------------------------------------------------ |
| MATCH_NOT_FOUND       | 404  | La partida no existe                                          |
| PLAYER_NOT_FOUND      | 404  | El jugador no existe en esa partida                           |
| MATCH_ALREADY_STARTED | 409  | Unirse o iniciar una partida que ya está activa               |
| MATCH_FULL            | 409  | Unirse a una partida en su cupo máximo                        |
| NOT_ENOUGH_PLAYERS    | 409  | Iniciar con menos de 2 jugadores                               |
| MATCH_NOT_ACTIVE      | 409  | Eliminar o saquear en una partida que no está `active`         |
| PLAYER_ELIMINATED     | 409  | Eliminar o saquear a un jugador ya eliminado                   |
| INVENTORY_FULL        | 409  | Saquear cuando el inventario ya alcanzó su capacidad           |
| INVALID_INPUT         | 400  | Falta o es inválido un campo mínimo de entrada (name, item...) |

## Verificación

- `npm test` — 52/52 tests (service con todos los errores de dominio, rutas HTTP end-to-end, error handler).
- `npm run test:coverage` — 100% líneas/branches/funciones en todos los archivos.
- Mutation testing manual (script de scratchpad, no versionado): 10/10 mutaciones deliberadas detectadas, incluyendo quitar cada guard de negocio, romper la detección de ganador, y desactivar el `instanceof DomainError` del error handler.
- Smoke test manual contra el servidor real (`curl`): partida completa de 3 jugadores — creación, cupo lleno, inicio, saqueo hasta llenar inventario, dos eliminaciones consecutivas que terminan la partida con ganador, y reintento sobre partida ya finalizada.

## Uso

```bash
npm install
npm start        # PORT 5004 por defecto
```

| Método | Ruta                                       | Descripción                          |
| ------ | ------------------------------------------- | -------------------------------------- |
| GET    | /health                                     | Estado de la API                       |
| POST   | /matches                                    | Crea una partida (`maxPlayers`, `inventoryCapacity`) |
| GET    | /matches/:id                                | Estado de una partida                  |
| POST   | /matches/:id/players                        | Un jugador se une (`name`)             |
| POST   | /matches/:id/start                          | Inicia la partida                      |
| POST   | /matches/:id/players/:playerId/eliminate    | Elimina a un jugador                   |
| POST   | /matches/:id/players/:playerId/loot         | El jugador recoge un objeto (`item`)   |
