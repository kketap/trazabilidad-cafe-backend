// src/modules/auth/auth.controller.ts
import type {
  Request,
  Response,
} from "express";

import type {
  AuthenticatedRequest,
} from "../../middlewares/verifyToken";

import {
  actualizarPerfil,
  cambiarPassword,
  cerrarSesion,
  login,
  renovarSesion,
} from "./auth.service";

import {
  getRefreshCookieOptions,
  REFRESH_COOKIE_NAME,
} from "./refresh-token.utils";

export async function loginController(
  req: Request,
  res: Response,
) {
  try {
    const { email, password } =
      req.body;

    if (!email || !password) {
      res.status(400).json({
        message:
          "Email y contraseña son obligatorios",
      });
      return;
    }

    const resultado = await login({
      email,
      password,
    });

    res.cookie(
      REFRESH_COOKIE_NAME,
      resultado.refreshToken,
      getRefreshCookieOptions(),
    );

    res.json({
      token:
        resultado.accessToken,
      usuario:
        resultado.usuario,
    });
  } catch (error) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "Error en el login";

    res.status(401).json({
      message: mensaje,
    });
  }
}

export async function actualizarPerfilController(req: AuthenticatedRequest, res: Response) {
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

    const usuario = await actualizarPerfil(userId, nombre.trim());

    res.json(usuario);
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "Error al actualizar perfil";

    res.status(400).json({ message: mensaje });
  }
}

export async function cambiarPasswordController(req: AuthenticatedRequest, res: Response) {
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

    await cambiarPassword(userId, contrasenaActual, nuevaContrasena);

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "Error al cambiar contraseña";

    res.status(400).json({ message: mensaje });
  }
}

export async function refreshController(
  req: Request,
  res: Response,
) {
  try {
    const refreshToken =
      req.cookies?.[
      REFRESH_COOKIE_NAME
      ];

    if (!refreshToken) {
      res.status(401).json({
        ok: false,
        code:
          "REFRESH_TOKEN_MISSING",
        message:
          "No existe una sesión renovable.",
      });
      return;
    }

    const resultado =
      await renovarSesion(
        refreshToken,
      );

    res.cookie(
      REFRESH_COOKIE_NAME,
      resultado.refreshToken,
      getRefreshCookieOptions(),
    );

    res.json({
      ok: true,
      token:
        resultado.accessToken,
    });
  } catch (error) {
    res.clearCookie(
      REFRESH_COOKIE_NAME,
      getRefreshCookieOptions(),
    );

    res.status(401).json({
      ok: false,
      code:
        "REFRESH_TOKEN_INVALID",
      message:
        error instanceof Error
          ? error.message
          : "No fue posible renovar la sesión",
    });
  }
}

export async function logoutController(
  req: Request,
  res: Response,
) {
  try {
    const refreshToken =
      req.cookies?.[
      REFRESH_COOKIE_NAME
      ];

    await cerrarSesion(refreshToken);
  } catch (error) {
    console.error(
      "Error al revocar refresh token:",
      error,
    );
  } finally {
    res.clearCookie(
      REFRESH_COOKIE_NAME,
      getRefreshCookieOptions(),
    );

    res.json({
      ok: true,
      message:
        "Sesión cerrada correctamente",
    });
  }
}