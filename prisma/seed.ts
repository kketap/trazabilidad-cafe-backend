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

  // Catálogo de lotes físicos (según apuntes). Nombres editables desde la app.
  const fundos: { codigo: string; cantidad: number }[] = [
    { codigo: "FSC", cantidad: 45 },
    { codigo: "FSS", cantidad: 36 },
    { codigo: "FDS", cantidad: 7 },
  ];

  for (const f of fundos) {
    const fundo = await prisma.fundo.upsert({
      where: { codigo: f.codigo },
      update: {},
      create: { codigo: f.codigo },
    });

    for (let numero = 1; numero <= f.cantidad; numero++) {
      await prisma.loteFisico.upsert({
        where: { codigo: `${f.codigo}-${numero}` },
        update: {},
        create: { codigo: `${f.codigo}-${numero}`, numero, fundoId: fundo.id },
      });
    }

    console.log(`Fundo ${f.codigo}: ${f.cantidad} lotes físicos verificados`);
  }
}

main()
  .catch((error) => {
    console.error("Error ejecutando seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
