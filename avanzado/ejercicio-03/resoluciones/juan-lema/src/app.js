import express from "express";
import { createChampionsService } from "./services/champions.service.js";
import { createChampionsController } from "./controllers/champions.controller.js";
import { createChampionsRouter } from "./routes/champions.routes.js";
import { errorHandler } from "./middlewares/error-handler.js";

function createApp({ champions = createChampionsService() } = {}) {
  const app = express();

  app.use(express.json());
  app.get("/health", (req, res) => res.json({ ok: true, message: "API de MOBA esports activa" }));
  app.use("/champions", createChampionsRouter({ controller: createChampionsController({ champions }) }));
  app.use((req, res) => res.status(404).json({ ok: false, code: "ROUTE_NOT_FOUND", message: "Ruta no encontrada" }));
  app.use(errorHandler);

  return app;
}

export { createApp };
