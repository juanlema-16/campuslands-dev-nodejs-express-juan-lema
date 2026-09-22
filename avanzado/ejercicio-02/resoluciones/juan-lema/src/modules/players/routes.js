import { Router } from "express";

function createPlayersRouter({ controller }) {
  const router = Router();

  router.get("/", controller.list);
  router.get("/:id", controller.get);
  router.post("/", controller.create);

  return router;
}

export { createPlayersRouter };
