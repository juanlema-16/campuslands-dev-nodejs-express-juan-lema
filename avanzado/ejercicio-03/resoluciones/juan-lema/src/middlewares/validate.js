import { SchemaValidationError } from "../errors.js";

function validate({ body, params, query } = {}) {
  const schemas = { body, params, query };

  return (req, res, next) => {
    const issues = [];
    const parsed = {};

    for (const [key, schema] of Object.entries(schemas)) {
      if (!schema) continue;

      const result = schema.safeParse(req[key]);
      if (result.success) {
        parsed[key] = result.data;
      } else {
        for (const issue of result.error.issues) issues.push({ path: [key, ...issue.path].join("."), message: issue.message });
      }
    }

    if (issues.length > 0) return next(new SchemaValidationError(issues));

    for (const [key, value] of Object.entries(parsed)) {
      Object.defineProperty(req, key, { value, writable: true, configurable: true, enumerable: true });
    }
    next();
  };
}

export { validate };
