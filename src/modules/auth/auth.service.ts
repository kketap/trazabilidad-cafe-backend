// src/modules/auth/auth.service.ts
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { prisma } from "../../config/prisma";

import {
  generateRefreshToken,
  getRefreshTokenExpiration,
  hashRefreshToken,
} from "./refresh-token.utils";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "La variable JWT_SECRET no está configurada",
  );
}

const JWT_EXPIRES_IN =
  process.env.JWT_EXPIRES_IN || "15m";

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthPayload = {
  userId: number;
  email: string;
  nombre: string;
  rol: string;
};

function crearAccessToken(
  payload: AuthPayload,
): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

async function crearRefreshToken(
  usuarioId: number,
): Promise<string> {
  const refreshToken =
    generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      usuarioId,
      tokenHash:
        hashRefreshToken(refreshToken),
      expiresAt:
        getRefreshTokenExpiration(),
    },
  });

  return refreshToken;
}

export async function actualizarPerfil(
  userId: number,
  nombre: string,
) {
  const usuario =
    await prisma.usuario.update({
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

export async function cambiarPassword(
  userId: number,
  passwordActual: string,
  nuevaPassword: string,
) {
  const usuario =
    await prisma.usuario.findUnique({
      where: {
        id: userId,
      },
    });

  if (!usuario) {
    throw new Error(
      "Usuario no encontrado",
    );
  }

  const passwordValida =
    await bcrypt.compare(
      passwordActual,
      usuario.password,
    );

  if (!passwordValida) {
    throw new Error(
      "La contraseña actual es incorrecta",
    );
  }

  const nuevoHash = await bcrypt.hash(
    nuevaPassword,
    10,
  );

  await prisma.$transaction([
    prisma.usuario.update({
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
    prisma.refreshToken.updateMany({
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

export async function login({
  email,
  password,
}: LoginInput) {
  const usuario =
    await prisma.usuario.findUnique({
      where: {
        email,
      },
    });

  if (!usuario) {
    throw new Error(
      "Credenciales inválidas",
    );
  }

  const passwordValida =
    await bcrypt.compare(
      password,
      usuario.password,
    );

  if (!passwordValida) {
    throw new Error(
      "Credenciales inválidas",
    );
  }

  const payload: AuthPayload = {
    userId: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
  };

  const accessToken =
    crearAccessToken(payload);

  const refreshToken =
    await crearRefreshToken(usuario.id);

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

export async function renovarSesion(
  refreshTokenActual: string,
) {
  const tokenHash =
    hashRefreshToken(
      refreshTokenActual,
    );

  const registro =
    await prisma.refreshToken.findUnique({
      where: {
        tokenHash,
      },
      include: {
        usuario: true,
      },
    });

  if (!registro) {
    throw new Error(
      "Refresh token inválido",
    );
  }

  if (registro.revokedAt) {
    /*
     * Un token ya usado o revocado fue presentado otra vez.
     * Se invalidan las demás sesiones renovables del usuario.
     */
    await prisma.refreshToken.updateMany({
      where: {
        usuarioId: registro.usuarioId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    throw new Error(
      "La sesión ya no es válida",
    );
  }

  if (
    registro.expiresAt.getTime() <=
    Date.now()
  ) {
    await prisma.refreshToken.update({
      where: {
        id: registro.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    throw new Error(
      "La sesión renovable ha expirado",
    );
  }

  const usuario = registro.usuario;

  const nuevoAccessToken =
    crearAccessToken({
      userId: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
    });

  const nuevoRefreshToken =
    generateRefreshToken();

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: {
        id: registro.id,
      },
      data: {
        revokedAt: new Date(),
      },
    }),

    prisma.refreshToken.create({
      data: {
        usuarioId: usuario.id,
        tokenHash:
          hashRefreshToken(
            nuevoRefreshToken,
          ),
        expiresAt:
          getRefreshTokenExpiration(),
      },
    }),
  ]);

  return {
    accessToken:
      nuevoAccessToken,
    refreshToken:
      nuevoRefreshToken,
  };
}

export async function cerrarSesion(
  refreshToken?: string,
) {
  if (!refreshToken) {
    return;
  }

  const tokenHash =
    hashRefreshToken(refreshToken);

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}