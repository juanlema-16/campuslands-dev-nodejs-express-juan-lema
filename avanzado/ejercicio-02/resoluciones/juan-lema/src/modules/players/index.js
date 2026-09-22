import { createPlayersService } from "./service.js";
import { createPlayersController } from "./controller.js";
import { createPlayersRouter } from "./routes.js";

const SEED_PLAYERS = [{ nickname: "Viper" }, { nickname: "Ashen" }];

const playersModule = {
  name: "players",
  basePath: "/players",
  dependencies: [],
  create() {
    const players = createPlayersService({ seed: SEED_PLAYERS });
    const controller = createPlayersController({ players });
    return { router: createPlayersRouter({ controller }), api: { exists: players.exists, getById: players.getById } };
  },
};

export default playersModule;
export { createPlayersService };
