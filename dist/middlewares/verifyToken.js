"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = verifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "changeme";
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader ||
        !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
            ok: false,
            code: "TOKEN_MISSING",
            message: "No se encontró una sesión válida. Inicia sesión nuevamente.",
        });
        return;
    }
    const token = authHeader
        .slice(7)
        .trim();
    if (!token) {
        res.status(401).json({
            ok: false,
            code: "TOKEN_MISSING",
            message: "No se encontró una sesión válida. Inicia sesión nuevamente.",
        });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({
                ok: false,
                code: "TOKEN_EXPIRED",
                message: "Tu sesión ha expirado. Inicia sesión nuevamente.",
            });
            return;
        }
        res.status(401).json({
            ok: false,
            code: "TOKEN_INVALID",
            message: "La sesión no es válida. Inicia sesión nuevamente.",
        });
    }
}
//# sourceMappingURL=verifyToken.js.map