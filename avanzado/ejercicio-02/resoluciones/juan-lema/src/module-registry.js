function createModuleRegistry() {
  const modules = new Map();

  function register(descriptor) {
    const { name, basePath, dependencies = [], create } = descriptor ?? {};

    if (typeof name !== "string" || !name) throw new Error("Un modulo debe declarar 'name'");
    if (modules.has(name)) throw new Error(`Ya hay un modulo registrado con el nombre "${name}"`);
    if (typeof basePath !== "string" || !basePath.startsWith("/")) throw new Error(`El modulo "${name}" debe declarar 'basePath' (ej. "/players")`);
    for (const existing of modules.values()) {
      if (existing.basePath === basePath) throw new Error(`basePath "${basePath}" ya esta en uso por el modulo "${existing.name}"`);
    }
    if (typeof create !== "function") throw new Error(`El modulo "${name}" debe declarar 'create'`);

    modules.set(name, { name, basePath, dependencies, create });
  }

  function resolveOrder() {
    const order = [];
    const state = new Map();

    function visit(name, path) {
      if (state.get(name) === "done") return;
      if (state.get(name) === "visiting") throw new Error(`Dependencia circular detectada: ${[...path, name].join(" -> ")}`);

      const module = modules.get(name);
      if (!module) throw new Error(`El modulo "${path.at(-1)}" depende de "${name}", que no esta registrado`);

      state.set(name, "visiting");
      for (const dependency of module.dependencies) visit(dependency, [...path, name]);
      state.set(name, "done");
      order.push(module);
    }

    for (const name of modules.keys()) visit(name, []);
    return order;
  }

  function createAll() {
    const created = new Map();
    const instances = [];

    for (const module of resolveOrder()) {
      const dependencyApis = Object.fromEntries(module.dependencies.map((dependency) => [dependency, created.get(dependency).api]));
      const instance = module.create(dependencyApis);
      if (!instance?.router) throw new Error(`El modulo "${module.name}" debe devolver { router, api } desde 'create'`);

      created.set(module.name, instance);
      instances.push({ name: module.name, basePath: module.basePath, router: instance.router });
    }

    return instances;
  }

  function mountAll(app) {
    for (const { basePath, router } of createAll()) app.use(basePath, router);
  }

  return { register, resolveOrder, createAll, mountAll };
}

export { createModuleRegistry };
