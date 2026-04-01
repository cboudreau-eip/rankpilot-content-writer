/**
 * Custom email/password authentication helper.
 * Uses the same JWT_SECRET as the existing Manus OAuth flow.
 * Cookie name: "rp_session" (separate from the Manus "app_session_id" cookie)
 */
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { Request, Response } from "express";
import { ENV } from "./_core/env";
import { getSessionCookieOptions } from "./_core/cookies";

export const RP_COOKIE_NAME = "rp_session";
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
const SALT_ROUNDS = 12;

export interface AppSessionPayload {
  userId: number;
  email: string;
  role: "user" | "admin";
}

function getSecretKey() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

/** Hash a plain-text password */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/** Compare a plain-text password against a stored hash */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Sign a JWT session token for an app user */
export async function signAppSession(
  payload: AppSessionPayload,
  expiresInMs = ONE_YEAR_MS
): Promise<string> {
  const secretKey = getSecretKey();
  const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

/** Verify and decode an app session JWT */
export async function verifyAppSession(
  token: string | undefined | null
): Promise<AppSessionPayload | null> {
  if (!token) return null;
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });
    const { userId, email, role } = payload as Record<string, unknown>;
    if (
      typeof userId !== "number" ||
      typeof email !== "string" ||
      (role !== "user" && role !== "admin")
    ) {
      return null;
    }
    return { userId, email, role };
  } catch {
    return null;
  }
}

/** Set the session cookie on the response */
export function setSessionCookie(
  res: Response,
  req: Request,
  token: string
): void {
  const opts = getSessionCookieOptions(req);
  res.cookie(RP_COOKIE_NAME, token, {
    ...opts,
    maxAge: ONE_YEAR_MS,
  });
}

/** Clear the session cookie */
export function clearSessionCookie(res: Response, req: Request): void {
  const opts = getSessionCookieOptions(req);
  res.clearCookie(RP_COOKIE_NAME, opts);
}

/** Read the session token from the request cookies */
export function getSessionToken(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string> | undefined;
  return cookies?.[RP_COOKIE_NAME];
}
