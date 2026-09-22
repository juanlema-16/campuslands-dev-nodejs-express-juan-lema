import { Router } from "express";

function createBattleRouter({ controller }) {
  const router = Router();

  router.post("/matches", controller.create);
  router.get("/matches/:id", controller.get);
  router.post("/matches/:id/players", controller.join);
  router.post("/matches/:id/start", controller.start);
  router.post("/matches/:id/players/:playerId/eliminate", controller.eliminate);
  router.post("/matches/:id/players/:playerId/loot", controller.loot);

  return router;
}

export { createBattleRouter };
