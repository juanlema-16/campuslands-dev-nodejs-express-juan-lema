const CLASSES = ["guerrero", "mago", "arquero", "clerigo"];

const heroes = [
  { id: 1, name: "Aldric", class: "guerrero", level: 5, hp: 120 },
  { id: 2, name: "Selene", class: "mago", level: 4, hp: 80 },
];
let nextId = 3;

function listHeroes() {
  return heroes;
}

function getHeroById(id) {
  return heroes.find((hero) => hero.id === Number(id)) || null;
}

function createHero({ name, class: heroClass, level }) {
  if (!name || typeof name !== "string" || !name.trim()) {
    throw new Error("name es obligatorio");
  }

  if (!heroClass || !CLASSES.includes(heroClass)) {
    throw new Error(`class debe ser una de: ${CLASSES.join(", ")}`);
  }

  const numericLevel = level === undefined ? 1 : Number(level);
  if (Number.isNaN(numericLevel) || numericLevel <= 0) {
    throw new Error("level debe ser un numero mayor a 0");
  }

  const hero = {
    id: nextId++,
    name: name.trim(),
    class: heroClass,
    level: numericLevel,
    hp: numericLevel * 20,
  };
  heroes.push(hero);
  return hero;
}

export { listHeroes, getHeroById, createHero };
