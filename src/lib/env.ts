/** Read an env var at call time (never at import time), so builds and tests need no env. */
export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export function requireEnv(name: string): string {
  const value = optionalEnv(name);
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}
