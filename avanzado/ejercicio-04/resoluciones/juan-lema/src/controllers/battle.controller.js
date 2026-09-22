const createBattleController = ({ battle }) => ({
  create: (req, res) => res.status(201).json({ ok: true, data: battle.create(req.body) }),
  get: (req, res) => res.json({ ok: true, data: battle.getById(req.params.id) }),
  join: (req, res) => res.status(201).json({ ok: true, data: battle.join(req.params.id, req.body) }),
  start: (req, res) => res.json({ ok: true, data: battle.start(req.params.id) }),
  eliminate: (req, res) => res.json({ ok: true, data: battle.eliminate(req.params.id, req.params.playerId) }),
  loot: (req, res) => res.json({ ok: true, data: battle.loot(req.params.id, req.params.playerId, req.body) }),
});

export { createBattleController };
