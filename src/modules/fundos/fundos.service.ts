// src/modules/fundos/fundos.service.ts
import { prisma } from "../../config/prisma";

export async function listarFundos() {
  return prisma.fundo.findMany({
    where: { activo: true },
    include: {
      lotesFisicos: {
        where: { activo: true },
        orderBy: { numero: "asc" },
      },
    },
    orderBy: { codigo: "asc" },
  });
}

export async function obtenerFundoPorId(id: number) {
  return prisma.fundo.findUnique({
    where: { id },
    include: {
      lotesFisicos: {
        orderBy: { numero: "asc" },
      },
    },
  });
}

export async function actualizarFundo(
  id: number,
  data: { nombre?: string | null; activo?: boolean }
) {
  return prisma.fundo.update({
    where: { id },
    data: {
      ...(data.nombre !== undefined && { nombre: data.nombre?.trim() || null }),
      ...(data.activo !== undefined && { activo: data.activo }),
    },
    include: {
      lotesFisicos: {
        orderBy: { numero: "asc" },
      },
    },
  });
}

export async function actualizarLoteFisico(
  id: number,
  data: { hectareas?: number | null; activo?: boolean }
) {
  return prisma.loteFisico.update({
    where: { id },
    data: {
      ...(data.hectareas !== undefined && {
        hectareas: data.hectareas != null ? Number(data.hectareas) : null,
      }),
      ...(data.activo !== undefined && { activo: data.activo }),
    },
  });
}
