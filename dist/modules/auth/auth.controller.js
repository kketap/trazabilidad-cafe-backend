"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginController = loginController;
exports.actualizarPerfilController = actualizarPerfilController;
exports.cambiarPasswordController = cambiarPasswordController;
const auth_service_1 = require("./auth.service");
async function loginController(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: "Email y contraseña son obligatorios" });
            return;
        }
        const resultado = await (0, auth_service_1.login)({ email, password });
        res.json(resultado);
    }
    catch (error) {
        const mensaje = error instanceof Error ? error.message : "Error en el login";
        res.status(401).json({ message: mensaje });
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
//# sourceMappingURL=auth.controller.js.map