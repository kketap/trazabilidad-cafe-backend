"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginController = loginController;
exports.actualizarPerfilController = actualizarPerfilController;
exports.cambiarPasswordController = cambiarPasswordController;
exports.refreshController = refreshController;
exports.logoutController = logoutController;
const auth_service_1 = require("./auth.service");
const refresh_token_utils_1 = require("./refresh-token.utils");
async function loginController(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({
                message: "Email y contraseña son obligatorios",
            });
            return;
        }
        const resultado = await (0, auth_service_1.login)({
            email,
            password,
        });
        res.cookie(refresh_token_utils_1.REFRESH_COOKIE_NAME, resultado.refreshToken, (0, refresh_token_utils_1.getRefreshCookieOptions)());
        res.json({
            token: resultado.accessToken,
            usuario: resultado.usuario,
        });
    }
    catch (error) {
        const mensaje = error instanceof Error
            ? error.message
            : "Error en el login";
        res.status(401).json({
            message: mensaje,
        });
    }
}
async function actualizarPerfilController(req, res) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ message: "No autorizado" });
            return;
        }
        const { nombre } = req.body;
        if (!nombre || typeof nombre !== "string" || nombre.trim().length === 0) {
            res.status(400).json({ message: "El nombre es obligatorio" });
            return;
        }
        const usuario = await (0, auth_service_1.actualizarPerfil)(userId, nombre.trim());
        res.json(usuario);
    }
    catch (error) {
        const mensaje = error instanceof Error ? error.message : "Error al actualizar perfil";
        res.status(400).json({ message: mensaje });
    }
}
async function cambiarPasswordController(req, res) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ message: "No autorizado" });
            return;
        }
        const { contrasenaActual, nuevaContrasena } = req.body;
        if (!contrasenaActual || !nuevaContrasena) {
            res.status(400).json({ message: "Contraseña actual y nueva son obligatorias" });
            return;
        }
        if (nuevaContrasena.length < 6) {
            res.status(400).json({ message: "La nueva contraseña debe tener al menos 6 caracteres" });
            return;
        }
        await (0, auth_service_1.cambiarPassword)(userId, contrasenaActual, nuevaContrasena);
        res.json({ message: "Contraseña actualizada correctamente" });
    }
    catch (error) {
        const mensaje = error instanceof Error ? error.message : "Error al cambiar contraseña";
        res.status(400).json({ message: mensaje });
    }
}
async function refreshController(req, res) {
    try {
        const refreshToken = req.cookies?.[refresh_token_utils_1.REFRESH_COOKIE_NAME];
        if (!refreshToken) {
            res.status(401).json({
                ok: false,
                code: "REFRESH_TOKEN_MISSING",
                message: "No existe una sesión renovable.",
            });
            return;
        }
        const resultado = await (0, auth_service_1.renovarSesion)(refreshToken);
        res.cookie(refresh_token_utils_1.REFRESH_COOKIE_NAME, resultado.refreshToken, (0, refresh_token_utils_1.getRefreshCookieOptions)());
        res.json({
            ok: true,
            token: resultado.accessToken,
        });
    }
    catch (error) {
        res.clearCookie(refresh_token_utils_1.REFRESH_COOKIE_NAME, (0, refresh_token_utils_1.getRefreshCookieOptions)());
        res.status(401).json({
            ok: false,
            code: "REFRESH_TOKEN_INVALID",
            message: error instanceof Error
                ? error.message
                : "No fue posible renovar la sesión",
        });
    }
}
async function logoutController(req, res) {
    try {
        const refreshToken = req.cookies?.[refresh_token_utils_1.REFRESH_COOKIE_NAME];
        await (0, auth_service_1.cerrarSesion)(refreshToken);
    }
    catch (error) {
        console.error("Error al revocar refresh token:", error);
    }
    finally {
        res.clearCookie(refresh_token_utils_1.REFRESH_COOKIE_NAME, (0, refresh_token_utils_1.getRefreshCookieOptions)());
        res.json({
            ok: true,
            message: "Sesión cerrada correctamente",
        });
    }
}
//# sourceMappingURL=auth.controller.js.map