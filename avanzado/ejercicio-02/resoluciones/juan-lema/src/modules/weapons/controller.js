const createWeaponsController = ({ weapons }) => ({
  list: (req, res) => res.json({ ok: true, data: weapons.list() }),
  get: (req, res) => res.json({ ok: true, data: weapons.getById(req.params.id) }),
  create(req, res) {
    const weapon = weapons.create(req.body);
    res.status(201).location(`/weapons/${weapon.id}`).json({ ok: true, data: weapon });
  },
});

export { createWeaponsController };
