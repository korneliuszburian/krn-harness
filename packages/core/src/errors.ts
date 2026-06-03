export class KRNError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "KRNError";
  }
}

export class ValidationError extends KRNError {
  constructor(message: string) {
    super(message, "KRN_VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}
