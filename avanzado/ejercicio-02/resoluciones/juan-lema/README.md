# Ejercicio 02 - arquitectura escalable (Juan Lema)

## Que hace

Tematica shooters competitivos. Tres dominios (`players`, `weapons`, `matches`) montados en una sola API. Lo que se practica no es el CRUD en si, sino un **patron de modulos auto-contenidos con un registro central** que resuelve dependencias entre ellos, para que agregar un cuarto dominio manana no obligue a tocar la logica existente.

## El problema que resuelve

Cuando una API crece a base de "importar cada router nuevo en `app.js`", `app.js` se convierte en el archivo que todos tocan y donde chocan los merges. Ademas, si un modulo necesita datos de otro (aqui, `matches` necesita saber si un `playerId` y un `weaponId` existen antes de crear una partida), la tentacion es importar el archivo de servicio del otro modulo directamente — y eso acopla la estructura de carpetas de un equipo con la de otro.

`src/module-registry.js` es la pieza que evita ambos problemas:

- Cada modulo es una carpeta independiente (`src/modules/<nombre>/`) con su propio `service.js`, `controller.js`, `routes.js`, y un `index.js` que lo describe: `{ name, basePath, dependencies, create }`.
- `create(dependencyApis)` recibe **solo la API publica** de sus dependencias (`{ exists, getById }`), nunca el modulo entero ni su archivo interno. `matches` declara `dependencies: ["players", "weapons"]` y usa `players.exists(...)` sin saber donde vive `players.service.js`.
- El registro calcula el **orden de creacion con un topological sort** (deteccion de ciclos con DFS de 3 colores), asi no importa en que orden se registren los modulos — la dependencia siempre se crea primero.
- El registro **falla rapido** con errores claros si: dos modulos usan el mismo `name` o el mismo `basePath`, un modulo depende de otro que nunca se registro, hay una dependencia circular (directa, indirecta o de un modulo consigo mismo), o un modulo no devuelve `{ router, api }`.
- `app.js` termina siendo trivial: `modules.forEach((m) => registry.register(m)); registry.mountAll(app);`. Agregar un modulo nuevo es una linea en el arreglo `DEFAULT_MODULES`, no una reescritura — se prueba literalmente en `test/module-registry.test.js`, montando un cuarto modulo (`tournaments`) sobre la app ya construida.

## Que se prueba (70 pruebas)

- `test/module-registry.test.js`: el corazon del ejercicio. Validaciones de registro, resolucion de orden (cadenas, dependencias compartidas por dos modulos), las tres formas de ciclo, dependencia faltante, inyeccion de la API real (no el descriptor) y la prueba de extensibilidad con un cuarto modulo.
- `test/players.service.test.js`, `test/weapons.service.test.js`: cada modulo probado aislado, sin HTTP.
- `test/matches.service.test.js`: `matches` probado con `players`/`weapons` reales inyectados (no HTTP), incluyendo los rechazos cuando un `playerId`/`weaponId` no existe en el modulo del que depende.
- `test/api.routes.test.js`: los tres modulos montados en una app real, con `POST /matches` cruzando de verdad hacia `players` y `weapons` por HTTP, y un `500` generico forzado con un modulo cuyo handler lanza un error.

### Verificacion de la calidad de las pruebas

Cobertura: **100 %** de lineas, ramas y funciones en todo `src/`. Se rompio el diseno a proposito de 10 formas (dejar de detectar un `basePath` repetido, dejar de detectar una dependencia circular o faltante, dejar de validar `playerId`/`weaponId` contra el modulo del que dependen...): **10 de 10** hicieron fallar al menos una prueba. En el camino aparecieron y se corrigieron dos bugs reales: `matches.getById` usaba `list().find(...)`, que nunca ejecuta su callback sobre un arreglo vacio (la validacion de id y el `404` nunca corrian sin partidas previas); y `players.exists("01")` coincidia por error con el jugador de id `1` porque solo comparaba `Number(id)` sin exigir el mismo formato que usa `getById`.

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
curl http://localhost:5002/players
curl http://localhost:5002/weapons
curl -X POST http://localhost:5002/matches -H "Content-Type: application/json" -d "{\"mapName\":\"Arena Cruce\",\"entries\":[{\"playerId\":1,\"weaponId\":1},{\"playerId\":2,\"weaponId\":2}]}"
```

## Como probar los casos de error

```bash
curl -X POST http://localhost:5002/matches -H "Content-Type: application/json" -d "{\"mapName\":\"Arena Cruce\",\"entries\":[{\"playerId\":999,\"weaponId\":1},{\"playerId\":2,\"weaponId\":2}]}"
curl http://localhost:5002/players/999
curl http://localhost:5002/players/abc
```

## Estructura

```text
src/
├── app.js
├── server.js
├── errors.js
├── module-registry.js
├── modules/
│   ├── players/  (index.js, service.js, controller.js, routes.js)
│   ├── weapons/  (index.js, service.js, controller.js, routes.js)
│   └── matches/  (index.js, service.js, controller.js, routes.js) — depende de players y weapons
└── middlewares/error-handler.js
test-support/
└── client.js
test/
├── module-registry.test.js
├── players.service.test.js
├── weapons.service.test.js
├── matches.service.test.js
└── api.routes.test.js
```
