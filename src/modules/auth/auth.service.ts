// src/modules/auth/auth.service.ts
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "changeme";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

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

export async function actualizarPerfil(userId: number, nombre: string) {
  const usuario = await prisma.usuario.update({
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

export async function cambiarPassword(
  userId: number,
  passwordActual: string,
  nuevaPassword: string,
) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
  });

  if (!usuario) {
    throw new Error("Usuario no encontrado");
  }

  const passwordValida = await bcrypt.compare(passwordActual, usuario.password);

  if (!passwordValida) {
    throw new Error("La contraseña actual es incorrecta");
  }

  const nuevoHash = await bcrypt.hash(nuevaPassword, 10);

  await prisma.usuario.update({
    where: { id: userId },
    data: { password: nuevoHash },
  });
}

export async function login({ email, password }: LoginInput) {
  const usuario = await prisma.usuario.findUnique({
    where: { email },
  });

  if (!usuario) {
    throw new Error("Credenciales inválidas");
  }

  const passwordValida = await bcrypt.compare(password, usuario.password);

  if (!passwordValida) {
    throw new Error("Credenciales inválidas");
  }

  const payload: AuthPayload = {
    userId: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);

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
