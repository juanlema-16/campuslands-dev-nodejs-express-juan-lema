const createPlayersController = ({ players }) => ({
  list: (req, res) => res.json({ ok: true, data: players.list() }),
  get: (req, res) => res.json({ ok: true, data: players.getById(req.params.id) }),
  create(req, res) {
    const player = players.create(req.body);
    res.status(201).location(`/players/${player.id}`).json({ ok: true, data: player });
  },
});

export { createPlayersController };
