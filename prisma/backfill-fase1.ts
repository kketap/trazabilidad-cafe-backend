// prisma/backfill-fase1.ts
// Copia las relaciones existentes (1:1) a las nuevas tablas intermedias de la Fase 1.
// Idempotente: usa upsert sobre las claves únicas compuestas.
// Ejecutar con:  npx ts-node prisma/backfill-fase1.ts
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();
const prisma = new PrismaClient();

async function main() {
  // 1) Secado.loteId -> SecadoLote (kilos exactos = kilosIngresados)
  const secados = await prisma.secado.findMany();
  for (const s of secados) {
    await prisma.secadoLote.upsert({
      where: { secadoId_loteId: { secadoId: s.id, loteId: s.loteId } },
      update: {},
      create: { secadoId: s.id, loteId: s.loteId, kilosUsados: s.kilosIngresados },
    });
  }
  console.log(`SecadoLote: ${secados.length} registros verificados`);

  // 2) Empaque.secadoId -> EmpaqueSecado
  const empaques = await prisma.empaque.findMany({ where: { secadoId: { not: null } } });
  for (const e of empaques) {
    await prisma.empaqueSecado.upsert({
      where: { empaqueId_secadoId: { empaqueId: e.id, secadoId: e.secadoId! } },
      update: {},
      create: { empaqueId: e.id, secadoId: e.secadoId!, kilosUsados: e.kilosIngresados },
    });
  }
  console.log(`EmpaqueSecado: ${empaques.length} registros verificados`);

  // 3) Lote.ordenTrillaId -> OrdenTrillaLote
  //    El histórico no guarda cuántos kg se descontaron por lote, solo el total
  //    de la orden. Solo se completa cuando la orden tiene UN lote (dato exacto);
  //    las órdenes multi-lote se reportan para revisión manual.
  const ordenes = await prisma.ordenTrilla.findMany({ include: { lotes: true } });
  const pendientes: string[] = [];
  for (const o of ordenes) {
    if (o.lotes.length === 1) {
      const lote = o.lotes[0];
      await prisma.ordenTrillaLote.upsert({
        where: { ordenTrillaId_loteId: { ordenTrillaId: o.id, loteId: lote.id } },
        update: {},
        create: { ordenTrillaId: o.id, loteId: lote.id, kilosDescontados: o.kilosEnviados },
      });
    } else if (o.lotes.length > 1) {
      pendientes.push(`${o.codigoTrilla} (${o.lotes.map((l) => l.codigo).join(", ")})`);
    }
  }
  console.log(`OrdenTrillaLote: ${ordenes.length - pendientes.length} órdenes procesadas`);
  if (pendientes.length) {
    console.warn("Órdenes multi-lote sin desglose (revisar manualmente):");
    pendientes.forEach((p) => console.warn("  -", p));
  }

  // 4) CosechaLote.kilosUsados queda en 0 para el histórico (no hay dato de reparto).
  const sinKilos = await prisma.cosechaLote.count({ where: { kilosUsados: 0 } });
  console.log(`CosechaLote con kilosUsados = 0: ${sinKilos} (revisar si se quiere completar)`);
}

main()
  .catch((e) => {
    console.error("Error en backfill:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
