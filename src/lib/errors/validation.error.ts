export interface ValidationErrorDetail {
  field?: string;
  message: string;
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly details?: ValidationErrorDetail[]
  ) {
    super(message);
    this.name = "ValidationError";
  }
}
