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
      dniRut: input.dniRut,
      nombre: input.nombre,
      personaJuridica: input.personaJuridica ?? false,
    },
  });
}

export async function actualizarCliente(id: number, input: UpdateClienteInput) {
  return prisma.cliente.update({
    where: { id },
    data: {
      ...(input.dniRut && { dniRut: input.dniRut }),
      ...(input.nombre && { nombre: input.nombre }),
      ...(input.personaJuridica !== undefined && { personaJuridica: input.personaJuridica }),
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