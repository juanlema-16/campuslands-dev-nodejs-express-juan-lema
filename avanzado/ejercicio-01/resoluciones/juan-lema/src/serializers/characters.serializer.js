const toV1 = ({ id, name, characterClass, level, hp, attack, defense }) => ({ id, name, class: characterClass, level, hp, attack, defense });

const toV2 = ({ id, name, characterClass, level, hp, attack, defense }) => ({ id, name, class: characterClass, level, stats: { hp, attack, defense } });

export { toV1, toV2 };
