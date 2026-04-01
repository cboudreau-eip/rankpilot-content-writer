/**
 * Tests for the custom email/password authentication system.
 * Covers: login, logout, me, changePassword, adminUsers CRUD.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ---- Context helpers ----

function makeCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  const cookies: Record<string, string> = {};
  const setCookieCalls: Array<[string, string, object]> = [];
  const clearCookieCalls: string[] = [];

  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      cookies,
    } as unknown as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, opts: object) => {
        cookies[name] = value;
        setCookieCalls.push([name, value, opts]);
      },
      clearCookie: (name: string) => {
        delete cookies[name];
        clearCookieCalls.push(name);
      },
    } as unknown as TrpcContext["res"],
    ...overrides,
  };
}

// ---- auth.me ----

describe("auth.me", () => {
  it("returns null when no session cookie is present", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns null when session cookie is invalid/expired", async () => {
    const ctx = makeCtx();
    (ctx.req.cookies as Record<string, string>)["rp_session"] = "invalid.token.here";
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

// ---- auth.login ----

describe("auth.login", () => {
  it("rejects login with missing email", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.login({ email: "not-an-email", password: "somepassword" })
    ).rejects.toThrow();
  });

  it("rejects login with empty password", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.login({ email: "test@example.com", password: "" })
    ).rejects.toThrow();
  });

  it("rejects login with unknown email", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.login({ email: "nobody@nowhere.example.com", password: "password123" })
    ).rejects.toThrow(/Invalid email or password/);
  });

  it("rejects login with wrong password", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    // cboudreau@teameip.com exists in DB but wrong password
    await expect(
      caller.auth.login({ email: "cboudreau@teameip.com", password: "wrongpassword!" })
    ).rejects.toThrow(/Invalid email or password/);
  });

  it("succeeds with correct credentials and sets session cookie", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.login({
      email: "cboudreau@teameip.com",
      password: "caboudr2",
    });
    expect(result).toMatchObject({
      email: "cboudreau@teameip.com",
      role: "admin",
    });
    // Cookie should be set
    const cookies = ctx.req.cookies as Record<string, string>;
    expect(cookies["rp_session"]).toBeDefined();
    expect(typeof cookies["rp_session"]).toBe("string");
  });
});

// ---- auth.logout ----

describe("auth.logout", () => {
  it("clears the session cookie and returns success", async () => {
    const ctx = makeCtx();
    (ctx.req.cookies as Record<string, string>)["rp_session"] = "some-token";
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    // Cookie should be cleared
    const cookies = ctx.req.cookies as Record<string, string>;
    expect(cookies["rp_session"]).toBeUndefined();
  });

  it("succeeds even when no cookie is present (idempotent)", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });
});

// ---- auth.changePassword ----

describe("auth.changePassword", () => {
  it("rejects when not authenticated", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.changePassword({ currentPassword: "old", newPassword: "newpassword123" })
    ).rejects.toThrow(/Not authenticated/);
  });

  it("rejects new password shorter than 8 characters (schema validation)", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.changePassword({ currentPassword: "old", newPassword: "short" })
    ).rejects.toThrow();
  });
});

// ---- adminUsers ----

describe("adminUsers", () => {
  it("list rejects when not authenticated", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.adminUsers.list()).rejects.toThrow(/Admin access required/);
  });

  it("create rejects when not authenticated", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.adminUsers.create({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        role: "user",
        mustChangePassword: true,
      })
    ).rejects.toThrow(/Admin access required/);
  });

  it("delete rejects when not authenticated", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.adminUsers.delete({ id: 999 })).rejects.toThrow(/Admin access required/);
  });

  it("update rejects when not authenticated", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.adminUsers.update({ id: 999, isActive: false })).rejects.toThrow(/Admin access required/);
  });
});

// ---- customAuth helpers ----

describe("customAuth helpers", () => {
  it("hashPassword and verifyPassword round-trip", async () => {
    const { hashPassword, verifyPassword } = await import("./customAuth");
    const hash = await hashPassword("mySecretPassword123");
    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(20);
    expect(await verifyPassword("mySecretPassword123", hash)).toBe(true);
    expect(await verifyPassword("wrongPassword", hash)).toBe(false);
  });

  it("signAppSession and verifyAppSession round-trip", async () => {
    const { signAppSession, verifyAppSession } = await import("./customAuth");
    const payload = { userId: 42, email: "test@example.com", role: "admin" as const };
    const token = await signAppSession(payload);
    expect(typeof token).toBe("string");
    const decoded = await verifyAppSession(token);
    expect(decoded).toMatchObject(payload);
  });

  it("verifyAppSession returns null for invalid token", async () => {
    const { verifyAppSession } = await import("./customAuth");
    expect(await verifyAppSession("not.a.valid.token")).toBeNull();
    expect(await verifyAppSession(null)).toBeNull();
    expect(await verifyAppSession(undefined)).toBeNull();
  });
});
