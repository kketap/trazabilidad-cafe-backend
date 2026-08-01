// src/modules/trabajadores/trabajadores.service.ts
import { prisma } from "../../config/prisma";

export type CreateTrabajadorInput = {
  nombres: string;
  apellidos?: string | null;
  dni: string;
  rol?: string | null;
  telefono?: string | null;
  activo?: boolean;
};

export type UpdateTrabajadorInput = Partial<CreateTrabajadorInput>;

export async function listarTrabajadores() {
  return prisma.trabajador.findMany({
    orderBy: {
      nombres: "asc",
    },
  });
}

export async function obtenerTrabajadorPorId(id: number) {
  return prisma.trabajador.findUnique({
    where: { id },
    include: {
      CosechaTrabajador: {
        include: {
          Cosecha: true,
        },
      },
    },
  });
}

export async function crearTrabajador(input: CreateTrabajadorInput) {
  return prisma.trabajador.create({
    data: {
      nombres: input.nombres.trim(),
      apellidos: input.apellidos?.trim() || null,
      dni: input.dni.trim(),
      rol: input.rol?.trim() || null,
      telefono: input.telefono?.trim() || null,
      activo: input.activo ?? true,
    },
  });
}

export async function actualizarTrabajador(
  id: number,
  input: UpdateTrabajadorInput,
) {
  return prisma.trabajador.update({
    where: { id },
    data: {
      ...(input.nombres !== undefined && {
        nombres: input.nombres.trim(),
      }),
      ...(input.apellidos !== undefined && {
        apellidos: input.apellidos?.trim() || null,
      }),
      ...(input.dni !== undefined && {
        dni: input.dni.trim(),
      }),
      ...(input.rol !== undefined && {
        rol: input.rol?.trim() || null,
      }),
      ...(input.telefono !== undefined && {
        telefono: input.telefono?.trim() || null,
      }),
      ...(input.activo !== undefined && {
        activo: input.activo,
      }),
    },
  });
}

export async function eliminarTrabajador(id: number) {
  const cosechasAsociadas = await prisma.cosechaTrabajador.count({
    where: {
      trabajadorId: id,
    },
  });

  if (cosechasAsociadas > 0) {
    return prisma.trabajador.update({
      where: { id },
      data: {
        activo: false,
      },
    });
  }

  return prisma.trabajador.delete({
    where: { id },
  });
}