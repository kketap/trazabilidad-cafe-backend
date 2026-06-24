// src/app.ts
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import morgan from "morgan";
import routes from "./routes";

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_LOCAL_URL,
  process.env.FRONTEND_PRODUCTION_URL,
].filter(Boolean) as string[];

console.log("CORS allowed origins:", allowedOrigins);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use("/api", routes);

app.use((_req, res) => {
  res.status(404).json({
    ok: false,
    message: "Ruta no encontrada",
  });
});

export default app;