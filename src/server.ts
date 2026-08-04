// src/server.ts
import dotenv from "dotenv";
dotenv.config();

import app from "./app";

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(
    `Servidor corriendo en puerto ${PORT}`,
  );
});