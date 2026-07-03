// src/middlewares/verifyToken.ts
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "changeme";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
    nombre: string;
    rol: string;
  };
}

export function verifyToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Token no proporcionado" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      email: string;
      nombre: string;
      rol: string;
    };

    req.user = decoded;

    next();
  } catch {
    res.status(401).json({ message: "Token inválido o expirado" });
  }
}
