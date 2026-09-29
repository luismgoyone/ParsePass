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
