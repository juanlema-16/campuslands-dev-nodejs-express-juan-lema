const createChampionsController = ({ champions }) => ({
  list: (req, res) => res.json({ ok: true, data: champions.list(req.query) }),
  get: (req, res) => res.json({ ok: true, data: champions.getById(req.params.id) }),
  create(req, res) {
    const champion = champions.create(req.body);
    res.status(201).location(`/champions/${champion.id}`).json({ ok: true, data: champion });
  },
  update: (req, res) => res.json({ ok: true, data: champions.update(req.params.id, req.body) }),
});

export { createChampionsController };
