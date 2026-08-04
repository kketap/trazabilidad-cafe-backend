"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.REFRESH_COOKIE_NAME = void 0;
exports.generateRefreshToken = generateRefreshToken;
exports.hashRefreshToken = hashRefreshToken;
exports.getRefreshTokenExpiration = getRefreshTokenExpiration;
exports.getRefreshCookieOptions = getRefreshCookieOptions;
// src/modules/auth/refresh-token.utils.ts
const crypto_1 = __importDefault(require("crypto"));
exports.REFRESH_COOKIE_NAME = "fundos_refresh_token";
function getRefreshTokenDays() {
    const value = Number(process.env.REFRESH_TOKEN_DAYS ?? 7);
    if (!Number.isFinite(value) || value <= 0) {
        return 7;
    }
    return value;
}
function generateRefreshToken() {
    return crypto_1.default
        .randomBytes(64)
        .toString("hex");
}
function hashRefreshToken(token) {
    return crypto_1.default
        .createHash("sha256")
        .update(token)
        .digest("hex");
}
function getRefreshTokenExpiration() {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() +
        getRefreshTokenDays());
    return expiration;
}
function getRefreshCookieOptions() {
    const isProduction = process.env.NODE_ENV === "production";
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
        maxAge: getRefreshTokenDays() *
            24 *
            60 *
            60 *
            1000,
    };
}
//# sourceMappingURL=refresh-token.utils.js.map