import { Router } from "express";
import heroesRoutes from "./heroes.routes.js";

const router = Router();

router.get("/health", (req, res) => {
  res.json({ ok: true, message: "API de RPG activa" });
});

router.use("/heroes", heroesRoutes);

export default router;
