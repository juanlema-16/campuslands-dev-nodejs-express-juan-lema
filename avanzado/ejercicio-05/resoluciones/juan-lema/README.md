# Ejercicio 05 (avanzado) — Transacciones simuladas

API de fichajes de futbol/futbol sala. El punto del ejercicio es simular una **transacción atómica** (todo-o-nada) sin una base de datos real detrás: si cualquier paso de un fichaje falla, todo lo que ya se había aplicado se deshace, como si nunca hubiera ocurrido.

## Diseño

- `src/utils/transaction.js` es un motor de transacciones **genérico** (no sabe nada de clubes ni jugadores). Recibe una lista de pasos `{ run, undo? }`. Ejecuta cada `run()` en orden; si uno lanza un error, deshace en orden **inverso** solo los pasos que ya se habían aplicado con éxito, y vuelve a lanzar el error original. El último paso de la cadena no necesita `undo` porque, por construcción, nada puede fallar después de él para disparar su rollback.
- `src/services/transfer.service.js` usa ese motor para un fichaje (`transfer`): 1) debita la cuota al club comprador (valida presupuesto), 2) acredita al club vendedor, 3) mueve al jugador (valida cupo del club destino). El orden es **deliberado**: el chequeo de cupo va al final, después de mover el dinero, para forzar un rollback real (no un simple "validar todo antes de mutar nada") cuando el cupo se agota justo en el último paso.
- Los errores de negocio (`ClubNotFoundError`, `InsufficientBudgetError`, `SquadFullError`, `SameClubError`, etc.) son una jerarquía de `DomainError`, igual que en el ejercicio anterior: el `errorHandler` solo necesita `instanceof DomainError`.

## Por qué esto es una "transacción simulada" y no solo una validación

Validar todo antes de mutar cualquier cosa también evita inconsistencias, pero no demuestra el patrón real de un sistema sin transacciones nativas (por ejemplo, coordinar dos servicios distintos). Aquí el presupuesto de ambos clubes SÍ se modifica antes de saber si el jugador entra en el cupo del destino; si falla, el motor deshace esos cambios explícitamente mediante funciones de compensación (`undo`), que es como se simula una transacción cuando no hay un motor de base de datos que la dé gratis.

## Verificación

- `npm test` — 39/39 tests (motor de transacciones genérico, service con cada error de negocio y su rollback, rutas HTTP end-to-end).
- `npm run test:coverage` — 100% líneas/branches/funciones en todos los archivos.
- Mutation testing manual (script de scratchpad, no versionado): 10/10 mutaciones deliberadas detectadas, incluyendo desactivar el rollback del motor de transacciones, quitar cada validación de negocio y desactivar el `instanceof DomainError` del error handler.
- Smoke test manual contra el servidor real (`curl`): un fichaje que falla por cupo lleno después de mover el dinero, verificando que ambos presupuestos y el club del jugador quedan exactamente igual que antes (rollback real por HTTP); y un fichaje exitoso inmediatamente después, verificando presupuestos y el registro en el ledger.

## Uso

```bash
npm install
npm start        # PORT 5005 por defecto
```

| Método | Ruta          | Descripción                                    |
| ------ | ------------- | ------------------------------------------------ |
| GET    | /health       | Estado de la API                                 |
| POST   | /clubs        | Crea un club (`name`, `budget`, `maxSquadSize`)  |
| GET    | /clubs        | Lista clubes                                     |
| GET    | /clubs/:id    | Detalle de un club                               |
| POST   | /players      | Agrega un jugador a un club (`name`, `clubId`)   |
| GET    | /players      | Lista jugadores                                  |
| POST   | /transfers    | Fichaje: transacción simulada (`playerId`, `toClubId`, `fee`) |
| GET    | /transfers    | Historial de fichajes confirmados (ledger)       |
