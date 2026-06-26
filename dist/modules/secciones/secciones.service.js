"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarSecciones = listarSecciones;
exports.crearSeccion = crearSeccion;
exports.obtenerSeccion = obtenerSeccion;
exports.actualizarSeccion = actualizarSeccion;
exports.eliminarSeccion = eliminarSeccion;
exports.obtenerCalculosGenerales = obtenerCalculosGenerales;
const prisma_1 = require("../../config/prisma");
async function listarSecciones() {
    return prisma_1.prisma.seccionCosecha.findMany({
        orderBy: {
            id: "desc",
        },
    });
}
async function crearSeccion(data) {
    return prisma_1.prisma.seccionCosecha.create({
        data: {
            titulo: data.titulo.trim(),
            descripcion: data.descripcion?.trim() || null,
            color: data.color.trim(),
        },
    });
}
async function obtenerSeccion(id) {
    return prisma_1.prisma.seccionCosecha.findUnique({
        where: { id },
    });
}
async function actualizarSeccion(id, data) {
    return prisma_1.prisma.seccionCosecha.update({
        where: { id },
        data: {
            ...(data.titulo !== undefined && { titulo: data.titulo.trim() }),
            ...(data.descripcion !== undefined && {
                descripcion: data.descripcion?.trim() || null,
            }),
            ...(data.color !== undefined && { color: data.color.trim() }),
        },
    });
}
async function eliminarSeccion(id) {
    return prisma_1.prisma.seccionCosecha.delete({
        where: { id },
    });
}
async function obtenerCalculosGenerales() {
    const secciones = await prisma_1.prisma.seccionCosecha.findMany({
        include: {
            cosechas: true,
        },
        orderBy: {
            id: "asc",
        },
    });
    return secciones.map((seccion) => {
        const kilosTotales = seccion.cosechas.reduce((total, cosecha) => total + cosecha.kilosCosechados, 0);
        const hectareasTotales = seccion.cosechas.reduce((total, cosecha) => total + cosecha.totalHectareas, 0);
        const rendimiento = hectareasTotales > 0 ? kilosTotales / hectareasTotales : 0;
        return {
            seccionId: seccion.id,
            titulo: seccion.titulo,
            color: seccion.color,
            totalCosechas: seccion.cosechas.length,
            kilosTotales,
            hectareasTotales,
            rendimiento,
        };
    });
}
//# sourceMappingURL=secciones.service.js.map