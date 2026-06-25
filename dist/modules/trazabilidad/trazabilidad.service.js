"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarProcesos = listarProcesos;
exports.crearProceso = crearProceso;
exports.obtenerResumenTrazabilidad = obtenerResumenTrazabilidad;
// src/modules/trazabilidad/trazabilidad.service.ts
const prisma_1 = require("../../config/prisma");
async function listarProcesos() {
    return prisma_1.prisma.procesoTrazabilidad.findMany({
        include: {
            cosecha: true,
        },
        orderBy: {
            fecha: "desc",
        },
    });
}
async function crearProceso(data) {
    const kilosIngresados = Number(data.kilosIngresados);
    const kilosResultantes = Number(data.kilosResultantes);
    const porcentajeMerma = kilosIngresados > 0
        ? ((kilosIngresados - kilosResultantes) / kilosIngresados) * 100
        : 0;
    return prisma_1.prisma.procesoTrazabilidad.create({
        data: {
            fecha: new Date(data.fecha),
            cosechaId: Number(data.cosechaId),
            etapa: data.etapa,
            kilosIngresados,
            kilosResultantes,
            porcentajeMerma,
        },
        include: {
            cosecha: true,
        },
    });
}
async function obtenerResumenTrazabilidad(filtros = {}) {
    const procesos = await prisma_1.prisma.procesoTrazabilidad.findMany({
        where: {
            ...(filtros.desde || filtros.hasta
                ? {
                    fecha: {
                        ...(filtros.desde && { gte: filtros.desde }),
                        ...(filtros.hasta && { lt: filtros.hasta }),
                    },
                }
                : {}),
        },
    });
    const totalIngresado = procesos.reduce((total, proceso) => total + proceso.kilosIngresados, 0);
    const totalResultante = procesos.reduce((total, proceso) => total + proceso.kilosResultantes, 0);
    const mermaPromedio = procesos.length > 0
        ? procesos.reduce((total, proceso) => total + proceso.porcentajeMerma, 0) / procesos.length
        : 0;
    return {
        totalProcesos: procesos.length,
        totalIngresado,
        totalResultante,
        mermaPromedio,
    };
}
//# sourceMappingURL=trazabilidad.service.js.map