"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarCosechas = listarCosechas;
exports.crearCosecha = crearCosecha;
exports.actualizarCosecha = actualizarCosecha;
exports.eliminarCosecha = eliminarCosecha;
exports.obtenerResumenCosechas = obtenerResumenCosechas;
// src/modules/cosechas/cosechas.service.ts
const prisma_1 = require("../../config/prisma");
async function listarCosechas() {
    return prisma_1.prisma.cosecha.findMany({
        orderBy: {
            fecha: "desc",
        },
    });
}
async function crearCosecha(data) {
    return prisma_1.prisma.cosecha.create({
        data: {
            fecha: new Date(data.fecha),
            kilosCosechados: Number(data.kilosCosechados),
            cantidadCosechadores: Number(data.cantidadCosechadores),
            lotes: data.lotes,
            totalHectareas: Number(data.totalHectareas),
            tipoCosecha: data.tipoCosecha,
        },
    });
}
async function actualizarCosecha(id, data) {
    return prisma_1.prisma.cosecha.update({
        where: { id },
        data: {
            ...(data.fecha && { fecha: new Date(data.fecha) }),
            ...(data.kilosCosechados !== undefined && {
                kilosCosechados: Number(data.kilosCosechados),
            }),
            ...(data.cantidadCosechadores !== undefined && {
                cantidadCosechadores: Number(data.cantidadCosechadores),
            }),
            ...(data.lotes !== undefined && { lotes: data.lotes }),
            ...(data.totalHectareas !== undefined && {
                totalHectareas: Number(data.totalHectareas),
            }),
            ...(data.tipoCosecha !== undefined && { tipoCosecha: data.tipoCosecha }),
        },
    });
}
async function eliminarCosecha(id) {
    return prisma_1.prisma.cosecha.delete({
        where: { id },
    });
}
async function obtenerResumenCosechas() {
    const cosechas = await prisma_1.prisma.cosecha.findMany();
    const kilosTotales = cosechas.reduce((total, cosecha) => total + cosecha.kilosCosechados, 0);
    const totalHectareas = cosechas.reduce((total, cosecha) => total + cosecha.totalHectareas, 0);
    const rendimiento = totalHectareas > 0 ? kilosTotales / totalHectareas : 0;
    return {
        totalCosechas: cosechas.length,
        kilosTotales,
        totalHectareas,
        rendimiento,
    };
}
//# sourceMappingURL=cosechas.service.js.map