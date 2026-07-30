"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarOrdenesTrilla = listarOrdenesTrilla;
exports.obtenerOrdenTrillaPorId = obtenerOrdenTrillaPorId;
exports.crearOrdenTrilla = crearOrdenTrilla;
exports.actualizarOrdenTrilla = actualizarOrdenTrilla;
exports.eliminarOrdenTrilla = eliminarOrdenTrilla;
// src/modules/trilla/trilla.service.ts
const crypto_1 = require("crypto");
const prisma_1 = require("../../config/prisma");
async function listarOrdenesTrilla() {
    return prisma_1.prisma.ordenTrilla.findMany({
        include: {
            lotes: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}
async function obtenerOrdenTrillaPorId(id) {
    return prisma_1.prisma.ordenTrilla.findUnique({
        where: { id },
        include: {
            lotes: true,
        },
    });
}
async function crearOrdenTrilla(data) {
    const uniqueId = (0, crypto_1.randomUUID)().replace(/-/g, "").substring(0, 8).toUpperCase();
    const codigoTrilla = data.codigoTrilla?.trim() || `TEMP-${uniqueId}`;
    const loteIds = Array.isArray(data.loteIds) ? data.loteIds.map((id) => Number(id)) : [];
    return prisma_1.prisma.ordenTrilla.create({
        data: {
            codigoTrilla,
            kilosEnviados: Number(data.kilosEnviados),
            fechaDespacho: data.fechaDespacho ? new Date(data.fechaDespacho) : new Date(),
            lotes: {
                connect: loteIds.map((id) => ({ id })),
            },
        },
        include: {
            lotes: true,
        },
    });
}
async function actualizarOrdenTrilla(id, data) {
    const ordenExistente = await prisma_1.prisma.ordenTrilla.findUnique({
        where: { id },
    });
    if (!ordenExistente) {
        throw new Error("Orden de trilla no encontrada");
    }
    const updateData = {};
    if (data.codigoTrilla !== undefined) {
        updateData.codigoTrilla = data.codigoTrilla.trim();
    }
    if (data.fechaDespacho !== undefined) {
        updateData.fechaDespacho = new Date(data.fechaDespacho);
    }
    if (data.fechaIngreso !== undefined) {
        updateData.fechaIngreso = data.fechaIngreso ? new Date(data.fechaIngreso) : null;
    }
    if (data.calidad !== undefined) {
        updateData.calidad = data.calidad ? data.calidad.trim() : null;
    }
    if (data.tipoSaco !== undefined) {
        updateData.tipoSaco = data.tipoSaco ? data.tipoSaco.trim() : null;
    }
    if (data.kilosEnviados !== undefined) {
        updateData.kilosEnviados = Number(data.kilosEnviados);
    }
    if (data.kilosNetos !== undefined) {
        updateData.kilosNetos = data.kilosNetos !== null ? Number(data.kilosNetos) : null;
    }
    if (data.loteIds !== undefined) {
        const loteIds = Array.isArray(data.loteIds) ? data.loteIds.map((lId) => Number(lId)) : [];
        updateData.lotes = {
            set: loteIds.map((lId) => ({ id: lId })),
        };
    }
    return prisma_1.prisma.ordenTrilla.update({
        where: { id },
        data: updateData,
        include: {
            lotes: true,
        },
    });
}
async function eliminarOrdenTrilla(id) {
    return prisma_1.prisma.ordenTrilla.delete({
        where: { id },
    });
}
//# sourceMappingURL=trilla.service.js.map