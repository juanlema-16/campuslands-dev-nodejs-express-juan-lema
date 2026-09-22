import { createMatchesService } from "./service.js";
import { createMatchesController } from "./controller.js";
import { createMatchesRouter } from "./routes.js";

const matchesModule = {
  name: "matches",
  basePath: "/matches",
  dependencies: ["players", "weapons"],
  create({ players, weapons }) {
    const matches = createMatchesService({ players, weapons });
    const controller = createMatchesController({ matches });
    return { router: createMatchesRouter({ controller }), api: {} };
  },
};

export default matchesModule;
export { createMatchesService };
