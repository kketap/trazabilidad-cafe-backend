// src/modules/trabajadores/trabajadores.service.ts
import { prisma } from "../../config/prisma";

export type CreateTrabajadorInput = {
  nombres: string;
  dni: string;
  rol?: string;
};

export type UpdateTrabajadorInput = Partial<CreateTrabajadorInput>;

export async function listarTrabajadores() {
  return prisma.trabajador.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function obtenerTrabajadorPorId(id: number) {
  return prisma.trabajador.findUnique({
    where: { id },
  });
}

export async function crearTrabajador(input: CreateTrabajadorInput) {
  return prisma.trabajador.create({
    data: {
      nombres: input.nombres,
      dni: input.dni,
      rol: input.rol || null,
    },
  });
}

export async function actualizarTrabajador(id: number, input: UpdateTrabajadorInput) {
  return prisma.trabajador.update({
    where: { id },
    data: input,
  });
}

export async function eliminarTrabajador(id: number) {
  return prisma.trabajador.delete({
    where: { id },
  });
}
