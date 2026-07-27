// src/modules/clientes/clientes.service.ts
import { prisma } from "../../config/prisma";

export type CreateClienteInput = {
  dniRut: string;
  nombre: string;
  personaJuridica?: boolean;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  activo?: boolean;
};

export type UpdateClienteInput = Partial<CreateClienteInput>;

export async function listarClientes() {
  return prisma.cliente.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function obtenerClientePorId(id: number) {
  return prisma.cliente.findUnique({
    where: { id },
  });
}

export async function crearCliente(input: CreateClienteInput) {
  return prisma.cliente.create({
    data: {
      dniRut: input.dniRut.trim(),
      nombre: input.nombre.trim(),
      personaJuridica: input.personaJuridica ?? false,
      telefono: input.telefono?.trim() || null,
      email: input.email?.trim() || null,
      direccion: input.direccion?.trim() || null,
      activo: input.activo ?? true,
    },
  });
}

export async function actualizarCliente(id: number, input: UpdateClienteInput) {
  return prisma.cliente.update({
    where: { id },
    data: {
      ...(input.dniRut !== undefined && {
        dniRut: input.dniRut.trim(),
      }),
      ...(input.nombre !== undefined && {
        nombre: input.nombre.trim(),
      }),
      ...(input.personaJuridica !== undefined && {
        personaJuridica: input.personaJuridica,
      }),
      ...(input.telefono !== undefined && {
        telefono: input.telefono?.trim() || null,
      }),
      ...(input.email !== undefined && {
        email: input.email?.trim() || null,
      }),
      ...(input.direccion !== undefined && {
        direccion: input.direccion?.trim() || null,
      }),
      ...(input.activo !== undefined && {
        activo: input.activo,
      }),
    },
  });
}

export async function eliminarCliente(id: number) {
  return prisma.cliente.update({
    where: { id },
    data: {
      activo: false,
    },
  });
}