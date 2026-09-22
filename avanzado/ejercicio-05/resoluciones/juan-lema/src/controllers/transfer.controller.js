const createTransferController = ({ transfers }) => ({
  createClub: (req, res) => res.status(201).json({ ok: true, data: transfers.createClub(req.body) }),
  listClubs: (req, res) => res.json({ ok: true, data: transfers.listClubs() }),
  getClub: (req, res) => res.json({ ok: true, data: transfers.getClub(req.params.id) }),
  createPlayer: (req, res) => res.status(201).json({ ok: true, data: transfers.createPlayer(req.body) }),
  listPlayers: (req, res) => res.json({ ok: true, data: transfers.listPlayers() }),
  transfer: (req, res) => res.status(201).json({ ok: true, data: transfers.transfer(req.body) }),
  listTransfers: (req, res) => res.json({ ok: true, data: transfers.listTransfers() }),
});

export { createTransferController };
