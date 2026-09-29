import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Read a generated fixture from tests/fixtures (see `pnpm fixtures`). */
export function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(import.meta.dirname, "../fixtures", name)));
}
