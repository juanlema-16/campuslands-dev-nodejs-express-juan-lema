const createMatchesController = ({ matches }) => ({
  list: (req, res) => res.json({ ok: true, data: matches.list() }),
  get: (req, res) => res.json({ ok: true, data: matches.getById(req.params.id) }),
  create(req, res) {
    const match = matches.create(req.body);
    res.status(201).location(`/matches/${match.id}`).json({ ok: true, data: match });
  },
});

export { createMatchesController };
