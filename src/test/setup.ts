import { vi } from "vitest";

// Prevent accidental use of a real database during tests.
delete process.env.DATABASE_URL;
delete process.env.BETTER_AUTH_SECRET;
delete process.env.BETTER_AUTH_URL;

// React cache() would otherwise reuse the first tenant resolution across tests.
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T): T => fn,
  };
});
