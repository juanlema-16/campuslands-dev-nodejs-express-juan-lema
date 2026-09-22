import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { validate } from "../src/middlewares/validate.js";

function run(middleware, req) {
  return new Promise((resolve) => {
    const res = {};
    middleware(req, res, (err) => resolve({ err, req }));
  });
}

describe("validate (middleware generico basado en schemas, sin conocer el dominio)", () => {
  it("sin schemas declarados, deja pasar cualquier request sin tocarla", async () => {
    const req = { body: { cualquier: "cosa" } };
    const { err, req: passed } = await run(validate(), req);

    assert.equal(err, undefined);
    assert.deepEqual(passed.body, { cualquier: "cosa" });
  });

  it("valida solo las partes declaradas (params sin declarar no se toca)", async () => {
    const req = { body: { n: "5" }, params: { extra: "lo-que-sea" } };
    const { err, req: passed } = await run(validate({ body: z.object({ n: z.coerce.number() }) }), req);

    assert.equal(err, undefined);
    assert.deepEqual(passed.body, { n: 5 });
    assert.deepEqual(passed.params, { extra: "lo-que-sea" });
  });

  it("cuando el body es valido, lo reemplaza por la version parseada (coercion incluida)", async () => {
    const schema = z.object({ n: z.coerce.number(), tag: z.string().trim() });
    const req = { body: { n: "42", tag: "  hola  " } };
    const { req: passed } = await run(validate({ body: schema }), req);

    assert.deepEqual(passed.body, { n: 42, tag: "hola" });
  });

  it("cuando falla, no toca req.body y llama a next con un SchemaValidationError", async () => {
    const req = { body: { n: "no-es-numero" } };
    const { err, req: passed } = await run(validate({ body: z.object({ n: z.number() }) }), req);

    assert.equal(err.name, "SchemaValidationError");
    assert.equal(err.status, 400);
    assert.equal(err.code, "VALIDATION_ERROR");
    assert.deepEqual(passed.body, { n: "no-es-numero" });
  });

  it("acumula los problemas de varias partes (body y params) en un solo error", async () => {
    const req = { body: { n: "x" }, params: { id: "y" } };
    const { err } = await run(validate({ body: z.object({ n: z.number() }), params: z.object({ id: z.coerce.number() }) }), req);

    const paths = err.details.map((d) => d.path);
    assert.ok(paths.some((p) => p.startsWith("body.")));
    assert.ok(paths.some((p) => p.startsWith("params.")));
  });

  it("cada detalle trae 'parte.campo' como path y un mensaje", async () => {
    const req = { body: { user: { name: 5 } } };
    const { err } = await run(validate({ body: z.object({ user: z.object({ name: z.string() }) }) }), req);

    assert.equal(err.details.length, 1);
    assert.equal(err.details[0].path, "body.user.name");
    assert.equal(typeof err.details[0].message, "string");
  });

  it("un error a nivel de todo el objeto (sin campo especifico) usa solo el nombre de la parte como path", async () => {
    const schema = z.object({ a: z.string().optional(), b: z.string().optional() }).refine((data) => data.a || data.b, "a o b son obligatorios");
    const { err } = await run(validate({ body: schema }), { body: {} });

    assert.equal(err.details[0].path, "body");
  });

  it("si TODAS las partes declaradas son validas, se reemplazan todas a la vez", async () => {
    const req = { body: { n: "1" }, query: { q: "2" } };
    const { req: passed } = await run(validate({ body: z.object({ n: z.coerce.number() }), query: z.object({ q: z.coerce.number() }) }), req);

    assert.deepEqual(passed.body, { n: 1 });
    assert.deepEqual(passed.query, { q: 2 });
  });
});
