const createCharactersController = ({ characters, serialize }) => ({
  list: (req, res) => res.json({ ok: true, data: characters.list().map(serialize) }),
  get: (req, res) => res.json({ ok: true, data: serialize(characters.getById(req.params.id)) }),
  create(req, res) {
    const { name, class: characterClass, level } = req.body ?? {};
    const character = characters.create({ name, characterClass, level });
    res.status(201).location(`${req.baseUrl}/${character.id}`).json({ ok: true, data: serialize(character) });
  },
});

export { createCharactersController };
