// src/middlewares/verifyToken.ts
import type {
  Request,
  Response,
  NextFunction,
} from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "changeme";

export interface AuthenticatedRequest
  extends Request {
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
  next: NextFunction,
) {
  const authHeader =
    req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ")
  ) {
    res.status(401).json({
      ok: false,
      code: "TOKEN_MISSING",
      message:
        "No se encontró una sesión válida. Inicia sesión nuevamente.",
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
      message:
        "No se encontró una sesión válida. Inicia sesión nuevamente.",
    });
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      JWT_SECRET,
    ) as {
      userId: number;
      email: string;
      nombre: string;
      rol: string;
    };

    req.user = decoded;

    next();
  } catch (error) {
    if (
      error instanceof jwt.TokenExpiredError
    ) {
      res.status(401).json({
        ok: false,
        code: "TOKEN_EXPIRED",
        message:
          "Tu sesión ha expirado. Inicia sesión nuevamente.",
      });
      return;
    }

    res.status(401).json({
      ok: false,
      code: "TOKEN_INVALID",
      message:
        "La sesión no es válida. Inicia sesión nuevamente.",
    });
  }
}