import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runTransaction } from "../src/utils/transaction.js";

function step(log, name, { failsOnRun = false } = {}) {
  return {
    run: () => {
      if (failsOnRun) throw new Error(`${name} fallo`);
      log.push(`run:${name}`);
    },
    undo: () => log.push(`undo:${name}`),
  };
}

describe("runTransaction (motor generico de transacciones simuladas, sin conocer el dominio)", () => {
  it("ejecuta todos los pasos en orden cuando ninguno falla, sin deshacer nada", () => {
    const log = [];
    runTransaction([step(log, "a"), step(log, "b"), step(log, "c")]);

    assert.deepEqual(log, ["run:a", "run:b", "run:c"]);
  });

  it("si un paso falla, deshace solo los pasos ya aplicados, en orden inverso", () => {
    const log = [];

    assert.throws(() => runTransaction([step(log, "a"), step(log, "b"), step(log, "c", { failsOnRun: true })]), /c fallo/);

    assert.deepEqual(log, ["run:a", "run:b", "undo:b", "undo:a"]);
  });

  it("no deshace el paso que fallo (nunca se marco como aplicado) ni ejecuta los siguientes", () => {
    const log = [];

    assert.throws(() => runTransaction([step(log, "a", { failsOnRun: true }), step(log, "b")]));

    assert.deepEqual(log, []);
  });

  it("relanza el error original tal cual, para que el caller decida como responder", () => {
    const original = new Error("motivo especifico");
    assert.throws(
      () =>
        runTransaction([
          {
            run: () => {
              throw original;
            },
            undo: () => {},
          },
        ]),
      (error) => error === original,
    );
  });

  it("una transaccion vacia no hace nada y no falla", () => {
    assert.doesNotThrow(() => runTransaction([]));
  });

  it("un paso sin undo (el ultimo de la cadena nunca necesita compensacion) no rompe el rollback de los anteriores", () => {
    const log = [];
    const withoutUndo = { run: () => log.push("run:sin-undo") };

    assert.throws(() => runTransaction([step(log, "a"), withoutUndo, step(log, "c", { failsOnRun: true })]));

    assert.deepEqual(log, ["run:a", "run:sin-undo", "undo:a"]);
  });
});
