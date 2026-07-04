export class AppError extends Error {
  constructor(
    public override readonly message: string,
    public readonly statusCode: number,
    public readonly errors?: unknown[]
  ) {
    super(message);
    this.name = 'AppError';
  }
}
