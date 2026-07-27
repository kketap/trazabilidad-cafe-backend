"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarClientes = listarClientes;
exports.obtenerClientePorId = obtenerClientePorId;
exports.crearCliente = crearCliente;
exports.actualizarCliente = actualizarCliente;
exports.eliminarCliente = eliminarCliente;
// src/modules/clientes/clientes.service.ts
const prisma_1 = require("../../config/prisma");
async function listarClientes() {
    return prisma_1.prisma.cliente.findMany({
        orderBy: {
            createdAt: "desc",
        },
    });
}
async function obtenerClientePorId(id) {
    return prisma_1.prisma.cliente.findUnique({
        where: { id },
    });
}
async function crearCliente(input) {
    return prisma_1.prisma.cliente.create({
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
async function actualizarCliente(id, input) {
    return prisma_1.prisma.cliente.update({
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
async function eliminarCliente(id) {
    return prisma_1.prisma.cliente.update({
        where: { id },
        data: {
            activo: false,
        },
    });
}
//# sourceMappingURL=clientes.service.js.map