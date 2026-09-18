import { Router } from "express";
import { getHeroes, getHero, postHero } from "../controllers/heroes.controller.js";

const router = Router();

router.get("/", getHeroes);
router.get("/:id", getHero);
router.post("/", postHero);

export default router;
