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
        orderBy: { createdAt: "desc" },
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
            dniRut: input.dni_rut,
            nombre: input.nombre,
            personaJuridica: input.persona_juridica ?? false,
        },
    });
}
async function actualizarCliente(id, input) {
    return prisma_1.prisma.cliente.update({
        where: { id },
        data: {
            ...(input.dni_rut && { dniRut: input.dni_rut }),
            ...(input.nombre && { nombre: input.nombre }),
            ...(input.persona_juridica !== undefined && { personaJuridica: input.persona_juridica }),
        },
    });
}
async function eliminarCliente(id) {
    return prisma_1.prisma.cliente.delete({
        where: { id },
    });
}
//# sourceMappingURL=clientes.service.js.map