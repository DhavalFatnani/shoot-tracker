export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(id ? `${resource} not found: ${id}` : `${resource} not found`, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class InvariantViolationError extends AppError {
  constructor(message: string) {
    super(message, "INVARIANT_VIOLATION");
    this.name = "InvariantViolationError";
  }
}

export class ConcurrentSessionError extends AppError {
  constructor(serialId: string) {
    super(`Serial ${serialId} is already in an open session`, "CONCURRENT_SESSION");
    this.name = "ConcurrentSessionError";
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}
