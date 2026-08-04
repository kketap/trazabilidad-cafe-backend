// src/modules/auth/refresh-token.utils.ts
import crypto from "crypto";
import type { CookieOptions } from "express";

export const REFRESH_COOKIE_NAME =
  "fundos_refresh_token";

function getRefreshTokenDays(): number {
  const value = Number(
    process.env.REFRESH_TOKEN_DAYS ?? 7,
  );

  if (!Number.isFinite(value) || value <= 0) {
    return 7;
  }

  return value;
}

export function generateRefreshToken(): string {
  return crypto
    .randomBytes(64)
    .toString("hex");
}

export function hashRefreshToken(
  token: string,
): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export function getRefreshTokenExpiration(): Date {
  const expiration = new Date();

  expiration.setDate(
    expiration.getDate() +
      getRefreshTokenDays(),
  );

  return expiration;
}

export function getRefreshCookieOptions(): CookieOptions {
  const isProduction =
    process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,

    /*
     * Úsalo cuando frontend y backend están desplegados
     * en sitios o dominios distintos.
     */
    sameSite: isProduction
      ? "none"
      : "lax",

    path: "/api/auth",

    maxAge:
      getRefreshTokenDays() *
      24 *
      60 *
      60 *
      1000,
  };
}