"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarLotes = listarLotes;
exports.crearLote = crearLote;
exports.actualizarLote = actualizarLote;
exports.eliminarLote = eliminarLote;
// src/modules/lotes/lotes.service.ts
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
            codigo,
            nombre: data.nombre?.trim() || null,
            tipoCodigo,
            estado: data.estado ?? "EN_PROCESO",
            kilosIniciales,
            kilosActuales: data.kilosActuales !== undefined && data.kilosActuales !== null
                ? Number(data.kilosActuales)
                : kilosIniciales,
            saldoTemporal: data.saldoTemporal !== undefined && data.saldoTemporal !== null
                ? Number(data.saldoTemporal)
                : null,
            // Campos mantenidos por compatibilidad, aunque ya no sean principales.
            hectareas: data.hectareas !== undefined && data.hectareas !== null
                ? Number(data.hectareas)
                : null,
            ubicacion: data.ubicacion?.trim() || null,
            observacion: data.observacion?.trim() || null,
            activo: data.activo ?? true,
            tipo_cafe: tipoCafe,
            horas_oxidacion: tipoCafe === "especial" && data.horas_oxidacion !== undefined && data.horas_oxidacion !== null
                ? Number(data.horas_oxidacion)
                : null,
            horas_fermentacion: tipoCafe === "especial" && data.horas_fermentacion !== undefined && data.horas_fermentacion !== null
                ? Number(data.horas_fermentacion)
                : null,
        },
    });
}
/**
 * Actualiza un lote productivo.
 */
async function actualizarLote(id, data) {
    const tipoCafe = data.tipo_cafe;
    return prisma_1.prisma.lote.update({
        where: { id },
        data: {
            ...(data.codigo !== undefined && {
                codigo: data.codigo.trim(),
            }),
            ...(data.nombre !== undefined && {
                nombre: data.nombre?.trim() || null,
            }),
            ...(data.tipoCodigo !== undefined && {
                tipoCodigo: data.tipoCodigo,
            }),
            ...(data.estado !== undefined && {
                estado: data.estado,
            }),
            ...(data.kilosIniciales !== undefined && {
                kilosIniciales: data.kilosIniciales !== null
                    ? Number(data.kilosIniciales)
                    : null,
            }),
            ...(data.kilosActuales !== undefined && {
                kilosActuales: data.kilosActuales !== null
                    ? Number(data.kilosActuales)
                    : null,
            }),
            ...(data.saldoTemporal !== undefined && {
                saldoTemporal: data.saldoTemporal !== null
                    ? Number(data.saldoTemporal)
                    : null,
            }),
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
/**
 * Desactiva un lote si tiene cosechas asociadas.
 * Si no tiene relaciones, se elimina físicamente.
 */
async function eliminarLote(id) {
    const cosechasAsociadas = await prisma_1.prisma.cosechaLote.count({
        where: {
            loteId: id,
        },
    });
    if (cosechasAsociadas > 0) {
        return prisma_1.prisma.lote.update({
            where: { id },
            data: {
                activo: false,
                estado: "INACTIVO",
            },
        });
    }
    return prisma_1.prisma.lote.delete({
        where: { id },
    });
}
//# sourceMappingURL=lotes.service.js.map