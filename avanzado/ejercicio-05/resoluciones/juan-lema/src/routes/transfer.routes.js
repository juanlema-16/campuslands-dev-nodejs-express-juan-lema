import { Router } from "express";

function createTransferRouter({ controller }) {
  const router = Router();

  router.post("/clubs", controller.createClub);
  router.get("/clubs", controller.listClubs);
  router.get("/clubs/:id", controller.getClub);
  router.post("/players", controller.createPlayer);
  router.get("/players", controller.listPlayers);
  router.post("/transfers", controller.transfer);
  router.get("/transfers", controller.listTransfers);

  return router;
}

export { createTransferRouter };
