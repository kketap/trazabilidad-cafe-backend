"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarSecados = listarSecados;
exports.obtenerSecadoPorId = obtenerSecadoPorId;
exports.crearSecado = crearSecado;
exports.actualizarSecado = actualizarSecado;
exports.eliminarSecado = eliminarSecado;
// src/modules/secado/secado.service.ts
const prisma_1 = require("../../config/prisma");
async function listarSecados() {
    return prisma_1.prisma.secado.findMany({
        include: {
            lote: true,
        },
        orderBy: {
            id: "desc",
        },
    });
}
async function obtenerSecadoPorId(id) {
    return prisma_1.prisma.secado.findUnique({
        where: { id },
        include: {
            lote: true,
        },
    });
}
async function crearSecado(data) {
    const kilosIngresados = Number(data.kilosIngresados);
    const kilosResultantes = Number(data.kilosResultantes);
    const merma = kilosIngresados - kilosResultantes;
    return prisma_1.prisma.$transaction(async (tx) => {
        const lote = await tx.lote.findUnique({
            where: { id: Number(data.loteId) },
        });
        if (!lote) {
            throw new Error("Lote no encontrado");
        }
        const secado = await tx.secado.create({
            data: {
                loteId: Number(data.loteId),
                fechaInicio: new Date(data.fechaInicio),
                fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
                kilosIngresados,
                kilosResultantes,
                merma,
                observaciones: data.observaciones || null,
                perfilProceso: data.perfilProceso,
            },
            include: {
                lote: true,
            },
        });
        await tx.lote.update({
            where: { id: Number(data.loteId) },
            data: {
                estado: "EN_SECADO",
                kilosActuales: kilosResultantes,
            },
        });
        return secado;
    });
}
async function actualizarSecado(id, data) {
    return prisma_1.prisma.$transaction(async (tx) => {
        const secadoExistente = await tx.secado.findUnique({
            where: { id },
        });
        if (!secadoExistente) {
            throw new Error("Proceso de secado no encontrado");
        }
        const kilosIngresados = data.kilosIngresados !== undefined ? Number(data.kilosIngresados) : secadoExistente.kilosIngresados;
        const kilosResultantes = data.kilosResultantes !== undefined ? Number(data.kilosResultantes) : secadoExistente.kilosResultantes;
        const merma = kilosIngresados - kilosResultantes;
        const loteId = data.loteId !== undefined ? Number(data.loteId) : secadoExistente.loteId;
        const secadoActualizado = await tx.secado.update({
            where: { id },
            data: {
                loteId,
                fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : undefined,
                fechaFin: data.fechaFin !== undefined ? (data.fechaFin ? new Date(data.fechaFin) : null) : undefined,
                kilosIngresados,
                kilosResultantes,
                merma,
                observaciones: data.observaciones !== undefined ? data.observaciones : undefined,
                ...(data.perfilProceso !== undefined && { perfilProceso: data.perfilProceso }),
            },
            include: {
                lote: true,
            },
        });
        if (data.kilosResultantes !== undefined || data.loteId !== undefined) {
            await tx.lote.update({
                where: { id: loteId },
                data: {
                    estado: "EN_SECADO",
                    kilosActuales: kilosResultantes,
                },
            });
        }
        return secadoActualizado;
    });
}
async function eliminarSecado(id) {
    return prisma_1.prisma.secado.delete({
        where: { id },
    });
}
//# sourceMappingURL=secado.service.js.map