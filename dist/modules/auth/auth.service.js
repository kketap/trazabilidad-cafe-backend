"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.actualizarPerfil = actualizarPerfil;
exports.cambiarPassword = cambiarPassword;
exports.login = login;
// src/modules/auth/auth.service.ts
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../../config/prisma");
const JWT_SECRET = process.env.JWT_SECRET || "changeme";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";
async function actualizarPerfil(userId, nombre) {
    const usuario = await prisma_1.prisma.usuario.update({
        where: { id: userId },
        data: { nombre },
    });
    return {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
    };
}
async function cambiarPassword(userId, passwordActual, nuevaPassword) {
    const usuario = await prisma_1.prisma.usuario.findUnique({
        where: { id: userId },
    });
    if (!usuario) {
        throw new Error("Usuario no encontrado");
    }
    const passwordValida = await bcrypt_1.default.compare(passwordActual, usuario.password);
    if (!passwordValida) {
        throw new Error("La contraseña actual es incorrecta");
    }
    const nuevoHash = await bcrypt_1.default.hash(nuevaPassword, 10);
    await prisma_1.prisma.usuario.update({
        where: { id: userId },
        data: { password: nuevoHash },
    });
}
async function login({ email, password }) {
    const usuario = await prisma_1.prisma.usuario.findUnique({
        where: { email },
    });
    if (!usuario) {
        throw new Error("Credenciales inválidas");
    }
    const passwordValida = await bcrypt_1.default.compare(password, usuario.password);
    if (!passwordValida) {
        throw new Error("Credenciales inválidas");
    }
    const payload = {
        userId: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
    };
    const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
    return {
        token,
        usuario: {
            id: usuario.id,
            email: usuario.email,
            nombre: usuario.nombre,
            rol: usuario.rol,
        },
    };
}
//# sourceMappingURL=auth.service.js.map