"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarClientes = listarClientes;
exports.listarClientesActivos = listarClientesActivos;
exports.obtenerClientePorId = obtenerClientePorId;
exports.crearCliente = crearCliente;
exports.actualizarCliente = actualizarCliente;
exports.eliminarCliente = eliminarCliente;
// src/modules/clientes/clientes.service.ts
const prisma_1 = require("../../config/prisma");
/**
 * Convierte cadenas vacías en null para mantener datos opcionales
 * consistentes en la base de datos.
 */
function normalizeOptionalText(value) {
    if (value === undefined) {
        return undefined;
    }
    const normalized = value?.trim();
    return normalized ? normalized : null;
}
async function listarClientes() {
    return prisma_1.prisma.cliente.findMany({
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
async function listarClientesActivos() {
    return prisma_1.prisma.cliente.findMany({
        where: {
            activo: true,
        },
        orderBy: {
            nombre: "asc",
        },
    });
}
async function obtenerClientePorId(id) {
    return prisma_1.prisma.cliente.findUnique({
        where: {
            id,
        },
    });
}
async function crearCliente(input) {
    return prisma_1.prisma.cliente.create({
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
async function actualizarCliente(id, input) {
    return prisma_1.prisma.cliente.update({
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
async function eliminarCliente(id) {
    return prisma_1.prisma.cliente.update({
        where: {
            id,
        },
        data: {
            activo: false,
        },
    });
}
//# sourceMappingURL=clientes.service.js.map