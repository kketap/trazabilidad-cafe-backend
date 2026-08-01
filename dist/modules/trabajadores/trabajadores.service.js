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
        orderBy: {
            nombres: "asc",
        },
    });
}
async function obtenerTrabajadorPorId(id) {
    return prisma_1.prisma.trabajador.findUnique({
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
async function crearTrabajador(input) {
    return prisma_1.prisma.trabajador.create({
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
async function actualizarTrabajador(id, input) {
    return prisma_1.prisma.trabajador.update({
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
async function eliminarTrabajador(id) {
    const cosechasAsociadas = await prisma_1.prisma.cosechaTrabajador.count({
        where: {
            trabajadorId: id,
        },
    });
    if (cosechasAsociadas > 0) {
        return prisma_1.prisma.trabajador.update({
            where: { id },
            data: {
                activo: false,
            },
        });
    }
    return prisma_1.prisma.trabajador.delete({
        where: { id },
    });
}
//# sourceMappingURL=trabajadores.service.js.map