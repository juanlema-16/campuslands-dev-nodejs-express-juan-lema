import express from "express";
import { createCharactersService } from "./services/characters.service.js";
import { createCharactersController } from "./controllers/characters.controller.js";
import { createCharactersRouter } from "./routes/characters.routes.js";
import { deprecate } from "./middlewares/deprecate.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { toV1, toV2 } from "./serializers/characters.serializer.js";
import { VERSIONS } from "./versions.js";

function createApp({ characters = createCharactersService() } = {}) {
  const app = express();

  app.use(express.json());
  app.get("/health", (req, res) => res.json({ ok: true, message: "API de RPG activa" }));
  app.get("/versions", (req, res) => res.json({ ok: true, data: VERSIONS }));

  app.use("/v1/characters", deprecate(VERSIONS.v1), createCharactersRouter({ controller: createCharactersController({ characters, serialize: toV1 }) }));
  app.use("/v2/characters", createCharactersRouter({ controller: createCharactersController({ characters, serialize: toV2 }) }));

  app.use((req, res) => res.status(404).json({ ok: false, code: "ROUTE_NOT_FOUND", message: "Ruta no encontrada" }));
  app.use(errorHandler);

  return app;
}

export { createApp };
