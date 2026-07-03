// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  const usuario = await prisma.usuario.upsert({
    where: { email: "admin@fundosnoche.com" },
    update: {},
    create: {
      email: "admin@fundosnoche.com",
      password: passwordHash,
      nombre: "Administrador",
      rol: "ADMIN",
    },
  });

  console.log("Usuario administrador creado/verificado:", usuario.email);
}

main()
  .catch((error) => {
    console.error("Error ejecutando seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
