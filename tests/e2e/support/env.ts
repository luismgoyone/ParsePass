/** Ports and URLs shared by playwright.config.ts and the e2e specs. */
export const E2E = {
  appPort: 3100,
  mockAnthropicPort: 4011,
};

export const appUrl = `http://localhost:${E2E.appPort}`;
export const mockAnthropicUrl = `http://localhost:${E2E.mockAnthropicPort}`;
