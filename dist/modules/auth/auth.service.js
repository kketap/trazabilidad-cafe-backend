"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.actualizarPerfil = actualizarPerfil;
exports.cambiarPassword = cambiarPassword;
exports.login = login;
exports.renovarSesion = renovarSesion;
exports.cerrarSesion = cerrarSesion;
// src/modules/auth/auth.service.ts
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../../config/prisma");
const refresh_token_utils_1 = require("./refresh-token.utils");
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("La variable JWT_SECRET no está configurada");
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
function crearAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
}
async function crearRefreshToken(usuarioId) {
    const refreshToken = (0, refresh_token_utils_1.generateRefreshToken)();
    await prisma_1.prisma.refreshToken.create({
        data: {
            usuarioId,
            tokenHash: (0, refresh_token_utils_1.hashRefreshToken)(refreshToken),
            expiresAt: (0, refresh_token_utils_1.getRefreshTokenExpiration)(),
        },
    });
    return refreshToken;
}
async function actualizarPerfil(userId, nombre) {
    const usuario = await prisma_1.prisma.usuario.update({
        where: {
            id: userId,
        },
        data: {
            nombre,
        },
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
        where: {
            id: userId,
        },
    });
    if (!usuario) {
        throw new Error("Usuario no encontrado");
    }
    const passwordValida = await bcrypt_1.default.compare(passwordActual, usuario.password);
    if (!passwordValida) {
        throw new Error("La contraseña actual es incorrecta");
    }
    const nuevoHash = await bcrypt_1.default.hash(nuevaPassword, 10);
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.usuario.update({
            where: {
                id: userId,
            },
            data: {
                password: nuevoHash,
            },
        }),
        /*
         * Invalida todas las sesiones activas
         * después de cambiar la contraseña.
         */
        prisma_1.prisma.refreshToken.updateMany({
            where: {
                usuarioId: userId,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        }),
    ]);
}
async function login({ email, password, }) {
    const usuario = await prisma_1.prisma.usuario.findUnique({
        where: {
            email,
        },
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
    const accessToken = crearAccessToken(payload);
    const refreshToken = await crearRefreshToken(usuario.id);
    return {
        accessToken,
        refreshToken,
        usuario: {
            id: usuario.id,
            email: usuario.email,
            nombre: usuario.nombre,
            rol: usuario.rol,
        },
    };
}
async function renovarSesion(refreshTokenActual) {
    const tokenHash = (0, refresh_token_utils_1.hashRefreshToken)(refreshTokenActual);
    const registro = await prisma_1.prisma.refreshToken.findUnique({
        where: {
            tokenHash,
        },
        include: {
            usuario: true,
        },
    });
    if (!registro) {
        throw new Error("Refresh token inválido");
    }
    if (registro.revokedAt) {
        /*
         * Un token ya usado o revocado fue presentado otra vez.
         * Se invalidan las demás sesiones renovables del usuario.
         */
        await prisma_1.prisma.refreshToken.updateMany({
            where: {
                usuarioId: registro.usuarioId,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });
        throw new Error("La sesión ya no es válida");
    }
    if (registro.expiresAt.getTime() <=
        Date.now()) {
        await prisma_1.prisma.refreshToken.update({
            where: {
                id: registro.id,
            },
            data: {
                revokedAt: new Date(),
            },
        });
        throw new Error("La sesión renovable ha expirado");
    }
    const usuario = registro.usuario;
    const nuevoAccessToken = crearAccessToken({
        userId: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
    });
    const nuevoRefreshToken = (0, refresh_token_utils_1.generateRefreshToken)();
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.refreshToken.update({
            where: {
                id: registro.id,
            },
            data: {
                revokedAt: new Date(),
            },
        }),
        prisma_1.prisma.refreshToken.create({
            data: {
                usuarioId: usuario.id,
                tokenHash: (0, refresh_token_utils_1.hashRefreshToken)(nuevoRefreshToken),
                expiresAt: (0, refresh_token_utils_1.getRefreshTokenExpiration)(),
            },
        }),
    ]);
    return {
        accessToken: nuevoAccessToken,
        refreshToken: nuevoRefreshToken,
    };
}
async function cerrarSesion(refreshToken) {
    if (!refreshToken) {
        return;
    }
    const tokenHash = (0, refresh_token_utils_1.hashRefreshToken)(refreshToken);
    await prisma_1.prisma.refreshToken.updateMany({
        where: {
            tokenHash,
            revokedAt: null,
        },
        data: {
            revokedAt: new Date(),
        },
    });
}
//# sourceMappingURL=auth.service.js.map