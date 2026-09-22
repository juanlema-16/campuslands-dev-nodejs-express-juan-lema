import { createWeaponsService, CATEGORIES } from "./service.js";
import { createWeaponsController } from "./controller.js";
import { createWeaponsRouter } from "./routes.js";

const SEED_WEAPONS = [{ name: "Aegis-7", category: "rifle" }, { name: "Whisper", category: "francotirador" }];

const weaponsModule = {
  name: "weapons",
  basePath: "/weapons",
  dependencies: [],
  create() {
    const weapons = createWeaponsService({ seed: SEED_WEAPONS });
    const controller = createWeaponsController({ weapons });
    return { router: createWeaponsRouter({ controller }), api: { exists: weapons.exists, getById: weapons.getById } };
  },
};

export default weaponsModule;
export { createWeaponsService, CATEGORIES };
