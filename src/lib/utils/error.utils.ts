export function getErrorMessage(error: unknown): string | null {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const possibleMessage = (error as Record<string, unknown>).message;
    if (typeof possibleMessage === "string") {
      return possibleMessage;
    }
    if (possibleMessage !== undefined && possibleMessage !== null) {
      return String(possibleMessage);
    }
  }

  return null;
}
