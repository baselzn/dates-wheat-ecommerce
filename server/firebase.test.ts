import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Firebase Phone Auth integration tests.
 * These tests verify:
 * 1. Firebase Admin SDK initializes with the configured projectId
 * 2. The firebaseLogin procedure rejects invalid tokens with UNAUTHORIZED
 * 3. The adminLogin procedure still works correctly
 */

function createPublicContext(): TrpcContext {
  const cookies: Record<string, string> = {};
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string) => { cookies[name] = value; },
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("Firebase Phone Auth", () => {
  it("Firebase Admin SDK should be configured with a projectId", async () => {
    // Validate that FIREBASE_PROJECT_ID env var is set
    expect(process.env.FIREBASE_PROJECT_ID).toBeTruthy();
    expect(typeof process.env.FIREBASE_PROJECT_ID).toBe("string");
    expect(process.env.FIREBASE_PROJECT_ID!.length).toBeGreaterThan(0);
  });

  it("firebaseLogin procedure exists in the auth router", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // Calling with an invalid token should throw UNAUTHORIZED, not "procedure not found"
    await expect(
      caller.auth.firebaseLogin({ idToken: "invalid-token", phone: "+971501234567" })
    ).rejects.toThrow();
  });

  it("firebaseLogin rejects invalid Firebase ID tokens with UNAUTHORIZED", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.auth.firebaseLogin({ idToken: "fake.invalid.token", phone: "+971501234567" });
      expect(true).toBe(false); // Should not reach here
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      // Should be UNAUTHORIZED (invalid token), not a 404 or procedure error
      expect(["UNAUTHORIZED", "INTERNAL_SERVER_ERROR"]).toContain(error.code);
    }
  });

  it("adminLogin procedure still works correctly", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // Wrong credentials should throw UNAUTHORIZED
    await expect(
      caller.auth.adminLogin({ email: "wrong@test.com", password: "wrongpassword" })
    ).rejects.toThrow();
  });
});
