export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** An extraction failure with a message that's safe and useful to show the user. */
export class ExtractError extends Error {
  constructor(
    message: string,
    readonly code: "too-large" | "unsupported" | "unreadable" | "empty",
  ) {
    super(message);
    this.name = "ExtractError";
  }
}
