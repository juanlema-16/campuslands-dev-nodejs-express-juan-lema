import express from "express";
import { createTransferService } from "./services/transfer.service.js";
import { createTransferController } from "./controllers/transfer.controller.js";
import { createTransferRouter } from "./routes/transfer.routes.js";
import { errorHandler } from "./middlewares/error-handler.js";

function createApp({ transfers = createTransferService() } = {}) {
  const app = express();

  app.use(express.json());
  app.get("/health", (req, res) => res.json({ ok: true, message: "API de fichajes activa" }));
  app.use(createTransferRouter({ controller: createTransferController({ transfers }) }));
  app.use((req, res) => res.status(404).json({ ok: false, code: "ROUTE_NOT_FOUND", message: "Ruta no encontrada" }));
  app.use(errorHandler);

  return app;
}

export { createApp };
