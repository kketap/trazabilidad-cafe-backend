// src/app.ts
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import routes from "./routes";

const app = express();

function parseOrigins(value?: string): string[] {
  return (
    value
      ?.split(",")
      .map((origin) => origin.trim().replace(/\/$/, ""))
      .filter(Boolean) ?? []
  );
}

const allowedOrigins = Array.from(
  new Set([
    "http://localhost:5173",
    "http://localhost:4173",
    ...parseOrigins(process.env.FRONTEND_URL),
    ...parseOrigins(process.env.FRONTEND_LOCAL_URL),
    ...parseOrigins(process.env.FRONTEND_PRODUCTION_URL),
    ...parseOrigins(process.env.CORS_ORIGINS),
  ]),
);

console.log("CORS allowed origins:", allowedOrigins);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = origin.replace(/\/$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      callback(
        new Error(
          `Origen no permitido por CORS: ${origin}`,
        ),
      );
    },
    credentials: true,
  }),
);

app.use(cookieParser());

app.use(express.json({ limit: "20mb" }));
app.use(
  express.urlencoded({
    extended: true,
    limit: "20mb",
  }),
);

app.use(morgan("dev"));

app.use("/api", routes);

app.use((_req, res) => {
  res.status(404).json({
    ok: false,
    message: "Ruta no encontrada",
  });
});

export default app;