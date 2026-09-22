import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { championBodySchema, championUpdateSchema, championQuerySchema, idParamSchema } from "../schemas/champions.schema.js";

function createChampionsRouter({ controller }) {
  const router = Router();

  router.get("/", validate({ query: championQuerySchema }), controller.list);
  router.get("/:id", validate({ params: idParamSchema }), controller.get);
  router.post("/", validate({ body: championBodySchema }), controller.create);
  router.patch("/:id", validate({ params: idParamSchema, body: championUpdateSchema }), controller.update);

  return router;
}

export { createChampionsRouter };
