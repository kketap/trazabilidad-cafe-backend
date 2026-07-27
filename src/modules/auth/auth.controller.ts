// src/modules/auth/auth.controller.ts
import type { Request, Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/verifyToken";
import { login, actualizarPerfil, cambiarPassword } from "./auth.service";

export async function loginController(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email y contraseña son obligatorios" });
      return;
    }

    const resultado = await login({ email, password });

    res.json(resultado);
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "Error en el login";

    res.status(401).json({ message: mensaje });
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
