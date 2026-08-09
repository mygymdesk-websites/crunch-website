/**
 * `server-only` throws on import outside a Server Component, which is exactly
 * what we want in the app and exactly what breaks a unit test. Aliasing it to
 * this no-op keeps the real guard in every build while letting server modules
 * be tested directly — the guard that matters is the one Next enforces at
 * build time, not the one vitest sees.
 */
export {};
