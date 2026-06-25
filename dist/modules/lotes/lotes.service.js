"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarLotes = listarLotes;
exports.crearLote = crearLote;
exports.actualizarLote = actualizarLote;
exports.eliminarLote = eliminarLote;
const prisma_1 = require("../../config/prisma");
async function listarLotes() {
    return prisma_1.prisma.lote.findMany({
        orderBy: {
            id: "desc",
        },
    });
}
async function crearLote(data) {
    return prisma_1.prisma.lote.create({
        data: {
            codigo: data.codigo.trim(),
            nombre: data.nombre?.trim() || null,
            hectareas: data.hectareas !== undefined && data.hectareas !== null
                ? Number(data.hectareas)
                : null,
            ubicacion: data.ubicacion?.trim() || null,
            observacion: data.observacion?.trim() || null,
            activo: data.activo ?? true,
        },
    });
}
async function actualizarLote(id, data) {
    return prisma_1.prisma.lote.update({
        where: { id },
        data: {
            ...(data.codigo !== undefined && { codigo: data.codigo.trim() }),
            ...(data.nombre !== undefined && { nombre: data.nombre?.trim() || null }),
            ...(data.hectareas !== undefined && {
                hectareas: data.hectareas !== null ? Number(data.hectareas) : null,
            }),
            ...(data.ubicacion !== undefined && {
                ubicacion: data.ubicacion?.trim() || null,
            }),
            ...(data.observacion !== undefined && {
                observacion: data.observacion?.trim() || null,
            }),
            ...(data.activo !== undefined && { activo: data.activo }),
        },
    });
}
async function eliminarLote(id) {
    return prisma_1.prisma.lote.delete({
        where: { id },
    });
}
//# sourceMappingURL=lotes.service.js.map