import { describe, expect, it } from "vitest";

import { stepForPath } from "@/components/shell/steps";

describe("stepForPath", () => {
  it("maps each route to its step", () => {
    expect(stepForPath("/")).toBe("upload");
    expect(stepForPath("/diagnostic")).toBe("diagnostic");
    expect(stepForPath("/review")).toBe("review");
    expect(stepForPath("/export")).toBe("export");
  });

  it("falls back to upload for unknown routes", () => {
    expect(stepForPath("/nope")).toBe("upload");
  });
});
