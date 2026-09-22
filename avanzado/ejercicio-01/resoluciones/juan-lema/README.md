# Ejercicio 01 - diseno API versionada (Juan Lema)

## Que hace

Tematica videojuegos RPG. Primer ejercicio del nivel avanzado. API de personajes servida en **dos versiones a la vez**, `/v1/characters` y `/v2/characters`, para practicar el problema real del versionado: como evolucionar el contrato de una API sin romper a los clientes que ya la usan.

- **v1** (forma plana, heredada): `{ id, name, class, level, hp, attack, defense }`.
- **v2** (forma nueva): agrupa el combate en un sub-objeto, `{ id, name, class, level, stats: { hp, attack, defense } }`. Es un cambio de contrato real (rompe a quien lea `data.hp` directamente), la razon tipica por la que se crea una v2 en vez de modificar v1 en el sitio.

## Como esta disenado

- **Una sola fuente de verdad**: `services/characters.service.js` no sabe que existen versiones. Guarda y valida los personajes en una forma canonica interna (`hp`, `attack`, `defense` sueltos, mas metadatos). Las reglas de negocio (clases validas, rango de nivel, calculo de stats por clase) viven una sola vez.
- **Solo cambia la traduccion de salida**: `serializers/characters.serializer.js` exporta `toV1` y `toV2`, dos funciones puras que convierten el personaje canonico a cada forma publica. `controllers/characters.controller.js` es generico (`createCharactersController({ characters, serialize })`); recibe el serializador por inyeccion, no tiene ningun `if` que pregunte la version.
- **Las rutas tambien son compartidas**: `routes/characters.routes.js` define `GET /`, `GET /:id`, `POST /` una sola vez. `app.js` monta ese mismo router dos veces, en `/v1/characters` con el controller-v1 y en `/v2/characters` con el controller-v2. Agregar una v3 manana significa escribir un serializador nuevo y una linea de montaje, no reescribir la logica.
- **Deprecar una version es explicito y visible**: `middlewares/deprecate.js` agrega los headers estandar `Deprecation`, `Sunset` (RFC 8594) y `Link: rel="successor-version"` a toda respuesta de `/v1`, exitosa o de error. `GET /versions` documenta en JSON el estado de cada version (`active` / `deprecated`) y su sucesora, para que un cliente pueda consultarlo programaticamente. `src/versions.js` es la unica fuente de esa metadata: el middleware y el endpoint la leen del mismo lugar.

## Que se prueba (41 pruebas)

- `test/characters.service.test.js`: reglas de negocio puras, sin HTTP ni versiones — clases validas, rango de nivel, que las stats crezcan con el nivel, copias defensivas.
- `test/versioning.routes.test.js`: el corazon del ejercicio. Crea un personaje en v1 y lo lee en v2 (y al reves) para probar que comparten los mismos datos con el mismo id; compara la forma exacta de la respuesta en cada version (`hp` suelto vs `stats.hp`); prueba que los headers de deprecacion aparecen en v1 (incluso en sus errores) y nunca en v2; prueba que las mismas reglas de validacion (`400`/`404`) aplican identicas en ambas versiones, porque vienen del mismo servicio.
- `test/error-handler.test.js`: el paso a Express cuando la respuesta ya se envio.

### Verificacion de la calidad de las pruebas

Cobertura: **100 %** de lineas, ramas y funciones en todo `src/` y en el cliente de pruebas. Se rompio el diseno a proposito de 12 formas (dejar de anidar `stats` en v2, dejar de exponer `defense` en v1, quitar el header `Sunset`, montar v1 sin el middleware de deprecacion, marcar v1 como `active`...): **12 de 12** hicieron fallar al menos una prueba. Probado tambien a mano contra el servidor real: un personaje creado por `POST /v1/characters` aparece de inmediato en `GET /v2/characters/:id` con los mismos numeros, solo reacomodados.

## Como ejecutar

```bash
npm install
npm start
```

## Como ejecutar las pruebas

```bash
npm test
npm run test:coverage
```

Verificado con Node 24; requiere Node 20 o superior.

## Como probar la API

```bash
curl http://localhost:5001/versions
curl -i -X POST http://localhost:5001/v1/characters -H "Content-Type: application/json" -d "{\"name\":\"Arden\",\"class\":\"guerrero\",\"level\":5}"
curl http://localhost:5001/v2/characters/1
curl -i http://localhost:5001/v1/characters
```

La `-i` en los ejemplos de v1 muestra los headers `Deprecation`, `Sunset` y `Link`.

## Como probar los casos de error

```bash
curl -X POST http://localhost:5001/v1/characters -H "Content-Type: application/json" -d "{\"name\":\"Arden\",\"class\":\"bardo\",\"level\":5}"
curl http://localhost:5001/v2/characters/999
curl http://localhost:5001/v3/characters
```

## Estructura

```text
src/
├── app.js
├── server.js
├── errors.js
├── versions.js
├── routes/characters.routes.js
├── controllers/characters.controller.js
├── serializers/characters.serializer.js
├── services/characters.service.js
└── middlewares/
    ├── deprecate.js
    └── error-handler.js
test-support/
└── client.js
test/
├── characters.service.test.js
├── versioning.routes.test.js
└── error-handler.test.js
```
