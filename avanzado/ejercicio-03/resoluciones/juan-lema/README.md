# Ejercicio 03 (avanzado) — Validacion con schemas (Zod)

API de campeones de un MOBA. El punto del ejercicio es mover toda la validacion de **formato** al borde de la aplicacion (un middleware generico basado en schemas de Zod) para que controllers y services solo se ocupen de **reglas de negocio**.

## Diseño

- `src/middlewares/validate.js` es un middleware **genérico**: no sabe nada de "campeones". Recibe `{ body, params, query }` con un schema de Zod por parte, corre `safeParse` sobre cada una, junta **todos** los errores (no corta en el primero) y responde `400 VALIDATION_ERROR` con un `details: [{ path, message }]` por cada campo inválido de cada parte.
- Si todas las partes declaradas son válidas, `req` se reemplaza por los datos ya parseados: con esto la coerción de Zod (`z.coerce.number()` en query strings, trims, etc.) llega tal cual al controller/service.
- `src/schemas/champions.schema.js` concentra las reglas de formato: rangos, enums, `.strict()` (rechaza mass assignment) y `.refine()` para reglas que un tipo simple no puede expresar (tags sin repetidos, update con al menos un campo).
- `src/services/champions.service.js` ya no valida formato (el schema lo garantiza antes de llegar aquí) y solo aplica reglas de negocio: nombre único (case/acento-insensible) y existencia del recurso.

## Hallazgo: `req.query` es de solo lectura en Express 5

En Express 5, `req.query` es un getter derivado de `req.url` que se recalcula en cada acceso (no es una propiedad propia). Esto rompe dos suposiciones habituales:

- `Object.assign(req, { query: {...} })` lanza `TypeError` (no hay setter).
- `Object.assign(req.query, {...})` no lanza, pero no persiste: el siguiente acceso a `req.query` genera un objeto nuevo y el cambio se pierde.

La solución usada en `validate.js` es `Object.defineProperty(req, key, { value, writable: true, configurable: true, enumerable: true })`, que crea una propiedad propia en la instancia y sombrea el getter del prototipo. Se aplica igual para `body`, `params` y `query`.

## Verificación

- `npm test` — 62/62 tests (middleware genérico con schemas falsos, schemas de dominio, service, y rutas HTTP end-to-end).
- `npm run test:coverage` — 100% líneas/branches/funciones en todos los archivos.
- Mutation testing manual (script de scratchpad, no versionado): 10/10 mutaciones deliberadas detectadas por la suite, incluyendo remover `.strict()`, remover el `.refine()` de tags repetidos, remover el chequeo de `NAME_TAKEN`, y dejar de acumular errores en `validate.js`.
- Smoke test manual contra el servidor real (`curl`): creación, mass-assignment rechazado, múltiples errores acumulados, coerción real de `?minDifficulty=` por HTTP, id inválido/inexistente, PATCH parcial y PATCH vacío.

## Uso

```bash
npm install
npm start        # PORT 5003 por defecto
```

| Método | Ruta             | Descripción                          |
| ------ | ---------------- | ------------------------------------- |
| GET    | /health          | Estado de la API                      |
| GET    | /champions        | Lista, filtra por `role`/`minDifficulty` |
| GET    | /champions/:id    | Detalle                               |
| POST   | /champions        | Crea (rechaza campos extra)           |
| PATCH  | /champions/:id    | Actualiza parcial (mín. 1 campo)      |
