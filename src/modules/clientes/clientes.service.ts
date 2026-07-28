// src/modules/clientes/clientes.service.ts
import { prisma } from "../../config/prisma";

export type CreateClienteInput = {
  dni_rut: string;
  nombre: string;
  persona_juridica?: boolean;
};

export type UpdateClienteInput = Partial<CreateClienteInput>;

export async function listarClientes() {
  return prisma.cliente.findMany({
    orderBy: { createdAt: "desc" },
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
      dniRut: input.dni_rut,
      nombre: input.nombre,
      personaJuridica: input.persona_juridica ?? false,
    },
  });
}

export async function actualizarCliente(id: number, input: UpdateClienteInput) {
  return prisma.cliente.update({
    where: { id },
    data: {
      ...(input.dni_rut && { dniRut: input.dni_rut }),
      ...(input.nombre && { nombre: input.nombre }),
      ...(input.persona_juridica !== undefined && { personaJuridica: input.persona_juridica }),
    },
  });
}

export async function eliminarCliente(id: number) {
  return prisma.cliente.delete({
    where: { id },
  });
}
