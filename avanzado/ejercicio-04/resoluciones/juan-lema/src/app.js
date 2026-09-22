import express from "express";
import { createBattleService } from "./services/battle.service.js";
import { createBattleController } from "./controllers/battle.controller.js";
import { createBattleRouter } from "./routes/battle.routes.js";
import { errorHandler } from "./middlewares/error-handler.js";

function createApp({ battle = createBattleService() } = {}) {
  const app = express();

  app.use(express.json());
  app.get("/health", (req, res) => res.json({ ok: true, message: "API de battle royale activa" }));
  app.use(createBattleRouter({ controller: createBattleController({ battle }) }));
  app.use((req, res) => res.status(404).json({ ok: false, code: "ROUTE_NOT_FOUND", message: "Ruta no encontrada" }));
  app.use(errorHandler);

  return app;
}

export { createApp };
