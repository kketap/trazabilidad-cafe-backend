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

/**
 * Convierte cadenas vacías en null para mantener datos opcionales
 * consistentes en la base de datos.
 */
function normalizeOptionalText(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value?.trim();

  return normalized ? normalized : null;
}

export async function listarClientes() {
  return prisma.cliente.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Devuelve solamente clientes activos.
 *
 * Se utiliza en formularios operativos, como ventas y facturación,
 * para impedir seleccionar clientes desactivados.
 */
export async function listarClientesActivos() {
  return prisma.cliente.findMany({
    where: {
      activo: true,
    },
    orderBy: {
      nombre: "asc",
    },
  });
}

export async function obtenerClientePorId(id: number) {
  return prisma.cliente.findUnique({
    where: {
      id,
    },
  });
}

export async function crearCliente(input: CreateClienteInput) {
  return prisma.cliente.create({
    data: {
      dniRut: input.dniRut.trim(),
      nombre: input.nombre.trim(),
      personaJuridica: input.personaJuridica ?? false,
      telefono: normalizeOptionalText(input.telefono),
      email: normalizeOptionalText(input.email),
      direccion: normalizeOptionalText(input.direccion),
      activo: input.activo ?? true,
    },
  });
}

export async function actualizarCliente(
  id: number,
  input: UpdateClienteInput,
) {
  return prisma.cliente.update({
    where: {
      id,
    },
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
        telefono: normalizeOptionalText(input.telefono),
      }),

      ...(input.email !== undefined && {
        email: normalizeOptionalText(input.email),
      }),

      ...(input.direccion !== undefined && {
        direccion: normalizeOptionalText(input.direccion),
      }),

      ...(input.activo !== undefined && {
        activo: input.activo,
      }),
    },
  });
}

/**
 * La eliminación es lógica: el registro se conserva y pasa a inactivo.
 */
export async function eliminarCliente(id: number) {
  return prisma.cliente.update({
    where: {
      id,
    },
    data: {
      activo: false,
    },
  });
}