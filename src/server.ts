// src/server.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes/index";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 4000;

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origen no permitido: ${origin}`));
    },
  }),
);

app.use(express.json());

app.use("/api", routes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});