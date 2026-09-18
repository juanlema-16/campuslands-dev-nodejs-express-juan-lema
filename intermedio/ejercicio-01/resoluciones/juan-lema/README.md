# Ejercicio 01 - arquitectura por capas (Juan Lema)

## Que hace

Tematica videojuegos RPG. Arquitectura por capas: `routes/index.js` centraliza el router y agrupa `heroes.routes.js`, que delega en `controllers/heroes.controller.js`, que a su vez usa `services/heroes.service.js` para la logica de negocio y los datos en memoria. `app.js` solo monta el router central.

## Como ejecutar

```bash
npm install
npm start
```

## Como probar

```bash
curl http://localhost:4001/heroes
curl http://localhost:4001/heroes/1
curl -X POST http://localhost:4001/heroes -H "Content-Type: application/json" -d "{\"name\":\"Thoric\",\"class\":\"guerrero\",\"level\":3}"
```

## Como probar los casos de error

```bash
curl http://localhost:4001/heroes/99
curl http://localhost:4001/heroes/abc
curl -X POST http://localhost:4001/heroes -H "Content-Type: application/json" -d "{\"name\":\"\"}"
```

## Estructura

```text
src/
├── app.js
├── server.js
├── routes/
│   ├── index.js
│   └── heroes.routes.js
├── controllers/
│   └── heroes.controller.js
└── services/
    └── heroes.service.js
```
