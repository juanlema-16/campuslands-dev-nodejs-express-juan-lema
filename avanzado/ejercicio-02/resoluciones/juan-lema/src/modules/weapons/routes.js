import { Router } from "express";

function createWeaponsRouter({ controller }) {
  const router = Router();

  router.get("/", controller.list);
  router.get("/:id", controller.get);
  router.post("/", controller.create);

  return router;
}

export { createWeaponsRouter };
