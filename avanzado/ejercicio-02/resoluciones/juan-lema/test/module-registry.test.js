import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Router } from "express";
import { createModuleRegistry } from "../src/module-registry.js";
import { createApp, DEFAULT_MODULES } from "../src/app.js";
import { startApp } from "../test-support/client.js";

const fakeModule = (name, basePath, dependencies = []) => ({
  name,
  basePath,
  dependencies,
  create: (deps) => ({ router: { name }, api: { deps } }),
});

describe("register: validaciones al agregar un modulo", () => {
  it("acepta un modulo minimo valido", () => {
    const registry = createModuleRegistry();

    assert.doesNotThrow(() => registry.register(fakeModule("a", "/a")));
  });

  for (const [label, descriptor] of [
    ["sin name", { basePath: "/a", create: () => {} }],
    ["sin basePath", { name: "a", create: () => {} }],
    ["basePath sin barra inicial", { name: "a", basePath: "a", create: () => {} }],
    ["sin create", { name: "a", basePath: "/a" }],
    ["create no es funcion", { name: "a", basePath: "/a", create: "no" }],
    ["descriptor vacio", {}],
    ["descriptor ausente", undefined],
  ]) {
    it(`rechaza: ${label}`, () => {
      assert.throws(() => createModuleRegistry().register(descriptor));
    });
  }

  it("rechaza un nombre de modulo repetido", () => {
    const registry = createModuleRegistry();
    registry.register(fakeModule("a", "/a"));

    assert.throws(() => registry.register(fakeModule("a", "/otra")), /nombre "a"/);
  });

  it("rechaza un basePath repetido entre dos modulos distintos", () => {
    const registry = createModuleRegistry();
    registry.register(fakeModule("a", "/shared"));

    assert.throws(() => registry.register(fakeModule("b", "/shared")), /"\/shared".*modulo "a"/);
  });
});

describe("resolveOrder: dependencias se resuelven antes que quien las necesita", () => {
  it("un modulo sin dependencias se resuelve solo", () => {
    const registry = createModuleRegistry();
    registry.register(fakeModule("a", "/a"));

    assert.deepEqual(registry.resolveOrder().map((m) => m.name), ["a"]);
  });

  it("el orden de registro no importa: la dependencia siempre queda antes", () => {
    const registry = createModuleRegistry();
    registry.register(fakeModule("matches", "/matches", ["players"]));
    registry.register(fakeModule("players", "/players"));

    assert.deepEqual(registry.resolveOrder().map((m) => m.name), ["players", "matches"]);
  });

  it("una cadena de tres modulos se resuelve en orden de dependencia", () => {
    const registry = createModuleRegistry();
    registry.register(fakeModule("c", "/c", ["b"]));
    registry.register(fakeModule("b", "/b", ["a"]));
    registry.register(fakeModule("a", "/a"));

    assert.deepEqual(registry.resolveOrder().map((m) => m.name), ["a", "b", "c"]);
  });

  it("un modulo usado por dos dependientes aparece una sola vez, antes de ambos", () => {
    const registry = createModuleRegistry();
    registry.register(fakeModule("shared", "/shared"));
    registry.register(fakeModule("x", "/x", ["shared"]));
    registry.register(fakeModule("y", "/y", ["shared"]));

    const order = registry.resolveOrder().map((m) => m.name);
    assert.deepEqual(order.filter((n) => n === "shared").length, 1);
    assert.ok(order.indexOf("shared") < order.indexOf("x"));
    assert.ok(order.indexOf("shared") < order.indexOf("y"));
  });

  it("depender de un modulo nunca registrado lanza un error claro", () => {
    const registry = createModuleRegistry();
    registry.register(fakeModule("matches", "/matches", ["players"]));

    assert.throws(() => registry.resolveOrder(), /"matches".*depende de "players".*no esta registrado/);
  });

  it("una dependencia circular directa (a depende de b, b depende de a) se detecta", () => {
    const registry = createModuleRegistry();
    registry.register(fakeModule("a", "/a", ["b"]));
    registry.register(fakeModule("b", "/b", ["a"]));

    assert.throws(() => registry.resolveOrder(), /Dependencia circular/);
  });

  it("una dependencia circular indirecta (a -> b -> c -> a) tambien se detecta", () => {
    const registry = createModuleRegistry();
    registry.register(fakeModule("a", "/a", ["b"]));
    registry.register(fakeModule("b", "/b", ["c"]));
    registry.register(fakeModule("c", "/c", ["a"]));

    assert.throws(() => registry.resolveOrder(), /Dependencia circular/);
  });

  it("un modulo que depende de si mismo se detecta como circular", () => {
    const registry = createModuleRegistry();
    registry.register(fakeModule("a", "/a", ["a"]));

    assert.throws(() => registry.resolveOrder(), /Dependencia circular/);
  });
});

describe("createAll: instancia cada modulo con las apis de sus dependencias ya resueltas", () => {
  it("inyecta la api de la dependencia, no el descriptor crudo", () => {
    const received = [];
    const registry = createModuleRegistry();
    registry.register({ name: "players", basePath: "/players", dependencies: [], create: () => ({ router: {}, api: { greet: () => "hola" } }) });
    registry.register({
      name: "matches",
      basePath: "/matches",
      dependencies: ["players"],
      create(deps) {
        received.push(deps);
        return { router: {}, api: {} };
      },
    });

    registry.createAll();

    assert.equal(typeof received[0].players.greet, "function");
    assert.equal(received[0].players.greet(), "hola");
  });

  it("cada modulo debe devolver un router desde create", () => {
    const registry = createModuleRegistry();
    registry.register({ name: "roto", basePath: "/roto", dependencies: [], create: () => ({}) });

    assert.throws(() => registry.createAll(), /"roto".*debe devolver \{ router, api \}/);
  });
});

describe("mountAll: monta cada router en su basePath dentro de una app real", () => {
  it("agregar un cuarto modulo es una sola linea (extensibilidad real)", async () => {
    const tournaments = {
      name: "tournaments",
      basePath: "/tournaments",
      dependencies: [],
      create: () => {
        const router = Router();
        router.get("/", (req, res) => res.json({ ok: true, data: [] }));
        return { router, api: {} };
      },
    };

    const app = createApp({ modules: [...DEFAULT_MODULES, tournaments] });
    const client = await startApp(app);

    try {
      const response = await client.request("GET", "/tournaments");
      assert.equal(response.status, 200);
      assert.deepEqual(response.body, { ok: true, data: [] });
    } finally {
      await client.close();
    }
  });
});
