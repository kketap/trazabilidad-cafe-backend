// src/modules/trilla/trilla.service.ts
import { randomUUID } from "crypto";
import { prisma } from "../../config/prisma";
import type { CrearOrdenTrillaDTO, ActualizarOrdenTrillaDTO } from "./trilla.dto";

export async function listarOrdenesTrilla() {
  return prisma.ordenTrilla.findMany({
    include: {
      lotes: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function obtenerOrdenTrillaPorId(id: string) {
  return prisma.ordenTrilla.findUnique({
    where: { id },
    include: {
      lotes: true,
    },
  });
}

export async function crearOrdenTrilla(data: CrearOrdenTrillaDTO) {
  const uniqueId = randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase();
  const codigoTrilla = data.codigoTrilla?.trim() || `TEMP-${uniqueId}`;

  const loteIds = Array.isArray(data.loteIds) ? data.loteIds.map((id) => Number(id)) : [];

  return prisma.ordenTrilla.create({
    data: {
      codigoTrilla,
      kilosEnviados: Number(data.kilosEnviados),
      fechaDespacho: data.fechaDespacho ? new Date(data.fechaDespacho) : new Date(),
      lotes: {
        connect: loteIds.map((id) => ({ id })),
      },
    },
    include: {
      lotes: true,
    },
  });
}

export async function actualizarOrdenTrilla(id: string, data: ActualizarOrdenTrillaDTO) {
  const ordenExistente = await prisma.ordenTrilla.findUnique({
    where: { id },
  });

  if (!ordenExistente) {
    throw new Error("Orden de trilla no encontrada");
  }

  const updateData: any = {};

  if (data.codigoTrilla !== undefined) {
    updateData.codigoTrilla = data.codigoTrilla.trim();
  }
  if (data.fechaDespacho !== undefined) {
    updateData.fechaDespacho = new Date(data.fechaDespacho);
  }
  if (data.fechaIngreso !== undefined) {
    updateData.fechaIngreso = data.fechaIngreso ? new Date(data.fechaIngreso) : null;
  }
  if (data.calidad !== undefined) {
    updateData.calidad = data.calidad ? data.calidad.trim() : null;
  }
  if (data.tipoSaco !== undefined) {
    updateData.tipoSaco = data.tipoSaco ? data.tipoSaco.trim() : null;
  }
  if (data.kilosEnviados !== undefined) {
    updateData.kilosEnviados = Number(data.kilosEnviados);
  }
  if (data.kilosNetos !== undefined) {
    updateData.kilosNetos = data.kilosNetos !== null ? Number(data.kilosNetos) : null;
  }
  if (data.loteIds !== undefined) {
    const loteIds = Array.isArray(data.loteIds) ? data.loteIds.map((lId) => Number(lId)) : [];
    updateData.lotes = {
      set: loteIds.map((lId) => ({ id: lId })),
    };
  }

  return prisma.ordenTrilla.update({
    where: { id },
    data: updateData,
    include: {
      lotes: true,
    },
  });
}

export async function eliminarOrdenTrilla(id: string) {
  return prisma.ordenTrilla.delete({
    where: { id },
  });
}
