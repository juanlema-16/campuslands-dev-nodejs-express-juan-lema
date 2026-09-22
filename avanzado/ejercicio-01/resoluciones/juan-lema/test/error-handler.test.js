import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { errorHandler } from "../src/middlewares/error-handler.js";

describe("errorHandler", () => {
  it("si la respuesta ya empezo a enviarse, delega en Express en vez de escribir otra", (t) => {
    const next = t.mock.fn();

    errorHandler(new Error("tarde"), {}, { headersSent: true }, next);

    assert.equal(next.mock.callCount(), 1);
  });
});
