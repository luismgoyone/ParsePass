import { z } from "zod";

export const SuggestionSchema = z.object({
  index: z.number().int().describe("Index of the original bullet in the list"),
  text: z.string().describe("The reworded bullet"),
  reason: z.string().describe("A few words on what improved, e.g. 'Stronger verb, less filler'"),
});

export const SuggestionsSchema = z.object({ suggestions: z.array(SuggestionSchema) });

export type Suggestion = z.infer<typeof SuggestionSchema>;
