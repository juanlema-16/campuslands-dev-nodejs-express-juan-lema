import express from "express";
import { createModuleRegistry } from "./module-registry.js";
import playersModule from "./modules/players/index.js";
import weaponsModule from "./modules/weapons/index.js";
import matchesModule from "./modules/matches/index.js";
import { errorHandler } from "./middlewares/error-handler.js";

const DEFAULT_MODULES = [playersModule, weaponsModule, matchesModule];

function createApp({ modules = DEFAULT_MODULES } = {}) {
  const app = express();
  const registry = createModuleRegistry();

  app.use(express.json());
  app.get("/health", (req, res) => res.json({ ok: true, message: "API de shooters competitivos activa" }));

  modules.forEach((module) => registry.register(module));
  registry.mountAll(app);

  app.use((req, res) => res.status(404).json({ ok: false, code: "ROUTE_NOT_FOUND", message: "Ruta no encontrada" }));
  app.use(errorHandler);

  return app;
}

export { createApp, DEFAULT_MODULES };
