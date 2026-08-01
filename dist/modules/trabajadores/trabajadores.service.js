"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarTrabajadores = listarTrabajadores;
exports.obtenerTrabajadorPorId = obtenerTrabajadorPorId;
exports.crearTrabajador = crearTrabajador;
exports.actualizarTrabajador = actualizarTrabajador;
exports.eliminarTrabajador = eliminarTrabajador;
// src/modules/trabajadores/trabajadores.service.ts
const prisma_1 = require("../../config/prisma");
async function listarTrabajadores() {
    return prisma_1.prisma.trabajador.findMany({
        orderBy: { createdAt: "desc" },
    });
}
async function obtenerTrabajadorPorId(id) {
    return prisma_1.prisma.trabajador.findUnique({
        where: { id },
    });
}
async function crearTrabajador(input) {
    return prisma_1.prisma.trabajador.create({
        data: {
            nombres: input.nombres,
            dni: input.dni,
            rol: input.rol || null,
        },
    });
}
async function actualizarTrabajador(id, input) {
    return prisma_1.prisma.trabajador.update({
        where: { id },
        data: input,
    });
}
async function eliminarTrabajador(id) {
    return prisma_1.prisma.trabajador.delete({
        where: { id },
    });
}
//# sourceMappingURL=trabajadores.service.js.map