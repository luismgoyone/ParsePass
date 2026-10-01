import type { Resume } from "@/lib/resume/schema";

export class ExtractionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

export interface ExtractionResult {
  resume: Resume;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

export type Link = { url: string; text: string };

/** One structured model call: a prompt in, schema-validated data out. */
export interface GenerateRequest<T> {
  /** Short name for logs, e.g. "extract". */
  task: string;
  /** Completes "Claude couldn't …", e.g. "structure this resume". */
  action: string;
  /** Shown after "This text couldn't be processed." when the model declines. */
  refusalHint: string;
  schema: T;
  system: string;
  user: string;
  maxTokens?: number;
}

export interface GenerateResult<T> {
  data: T;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}
