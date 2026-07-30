"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarProcesos = listarProcesos;
exports.crearProceso = crearProceso;
exports.actualizarProceso = actualizarProceso;
exports.eliminarProceso = eliminarProceso;
exports.obtenerResumenTrazabilidad = obtenerResumenTrazabilidad;
// src/modules/trazabilidad/trazabilidad.service.ts
const prisma_1 = require("../../config/prisma");
async function listarProcesos() {
    return prisma_1.prisma.procesoTrazabilidad.findMany({
        include: {
            cosecha: true,
            Lote: true,
        },
        orderBy: {
            fecha: "desc",
        },
    });
}
function calculateDurationHours(start, end, fallback = 0) {
    if (start && end) {
        const diff = new Date(end).getTime() - new Date(start).getTime();
        if (diff > 0)
            return diff / (1000 * 60 * 60);
    }
    return fallback;
}
async function crearProceso(data) {
    const kilosIngresados = Number(data.kilosIngresados);
    const codigo = data.codigo || `PROC-${Date.now()}`;
    const duracionHoras = calculateDurationHours(data.fechaInicio, data.fechaFin, data.duracionHoras !== undefined ? Number(data.duracionHoras) : 0);
    const fechaInicio = data.fechaInicio ? new Date(data.fechaInicio) : undefined;
    const fechaFin = data.fechaFin ? new Date(data.fechaFin) : undefined;
    const tipoProcesoStr = data.tipoProceso;
    return prisma_1.prisma.procesoTrazabilidad.create({
        data: {
            fecha: new Date(data.fecha),
            loteId: data.loteId ? Number(data.loteId) : null,
            cosechaId: data.cosechaId ? Number(data.cosechaId) : null,
            etapa: data.etapa,
            tipoProceso: tipoProcesoStr,
            kilosIngresados,
            codigo,
            duracionHoras,
            fechaInicio,
            fechaFin,
        },
        include: {
            cosecha: true,
            Lote: true,
        },
    });
}
async function actualizarProceso(id, data) {
    const kilosIngresados = data.kilosIngresados !== undefined ? Number(data.kilosIngresados) : undefined;
    const duracionHoras = data.fechaInicio && data.fechaFin
        ? calculateDurationHours(data.fechaInicio, data.fechaFin)
        : (data.duracionHoras !== undefined ? Number(data.duracionHoras) : undefined);
    return prisma_1.prisma.procesoTrazabilidad.update({
        where: { id },
        data: {
            ...(data.fecha && { fecha: new Date(data.fecha) }),
            ...(data.loteId !== undefined && { loteId: data.loteId ? Number(data.loteId) : null }),
            ...(data.cosechaId !== undefined && { cosechaId: data.cosechaId ? Number(data.cosechaId) : null }),
            ...(data.etapa !== undefined && { etapa: data.etapa }),
            ...(data.tipoProceso !== undefined && { tipoProceso: data.tipoProceso }),
            ...(kilosIngresados !== undefined && { kilosIngresados }),
            ...(data.codigo !== undefined && { codigo: data.codigo }),
            ...(duracionHoras !== undefined && { duracionHoras }),
            ...(data.fechaInicio !== undefined && { fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : null }),
            ...(data.fechaFin !== undefined && { fechaFin: data.fechaFin ? new Date(data.fechaFin) : null }),
        },
        include: {
            cosecha: true,
            Lote: true,
        },
    });
}
async function eliminarProceso(id) {
    return prisma_1.prisma.procesoTrazabilidad.delete({
        where: { id },
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
    return {
        totalProcesos: procesos.length,
        totalIngresado,
    };
}
//# sourceMappingURL=trazabilidad.service.js.map