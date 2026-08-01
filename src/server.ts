// src/server.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes/index";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 4000;

const parseOrigins = (value?: string) =>
  value
    ?.split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean) ?? [];

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  ...parseOrigins(process.env.FRONTEND_URL),
  ...parseOrigins(process.env.FRONTEND_LOCAL_URL),
  ...parseOrigins(process.env.FRONTEND_PRODUCTION_URL),
  ...parseOrigins(process.env.CORS_ORIGINS),
];

console.log("CORS allowed origins:", allowedOrigins);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origen no permitido: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(express.json());

app.use("/api", routes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});