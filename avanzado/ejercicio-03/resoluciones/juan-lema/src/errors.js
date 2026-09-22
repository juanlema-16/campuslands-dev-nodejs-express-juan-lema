class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

class SchemaValidationError extends AppError {
  constructor(details) {
    super(400, "VALIDATION_ERROR", "El cuerpo o los parametros no cumplen el schema");
    this.name = "SchemaValidationError";
    this.details = details;
  }
}

export { AppError, SchemaValidationError };
