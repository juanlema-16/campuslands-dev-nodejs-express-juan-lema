import { listHeroes, getHeroById, createHero } from "../services/heroes.service.js";

function getHeroes(req, res) {
  res.json({ ok: true, data: listHeroes() });
}

function getHero(req, res) {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    res.status(400).json({ ok: false, message: "id debe ser numerico" });
    return;
  }

  const hero = getHeroById(id);
  if (!hero) {
    res.status(404).json({ ok: false, message: `Heroe con id ${id} no encontrado` });
    return;
  }

  res.json({ ok: true, data: hero });
}

function postHero(req, res) {
  try {
    const hero = createHero(req.body || {});
    res.status(201).json({ ok: true, data: hero });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
}

export { getHeroes, getHero, postHero };
