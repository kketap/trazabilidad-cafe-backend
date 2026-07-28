// src/modules/empaque/empaque.service.ts
import { prisma } from "../../config/prisma";

export type EmpaqueInput = {
    loteId: number;
    fechaInicio: string | Date;
    fechaFin?: string | Date | null;
    kilosIngresados: number;
    kilosResultantes: number;
    observaciones?: string | null;
};

export async function listarEmpaques() {
    return prisma.empaque.findMany({
        include: {
            lote: true,
        },
        orderBy: {
            id: "desc",
        },
    });
}

export async function obtenerEmpaquePorId(id: number) {
    return prisma.empaque.findUnique({
        where: { id },
        include: {
            lote: true,
        },
    });
}

export async function crearEmpaque(data: EmpaqueInput) {
    const kilosIngresados = Number(data.kilosIngresados);
    const kilosResultantes = Number(data.kilosResultantes);
    const merma = kilosIngresados - kilosResultantes;

    return prisma.$transaction(async (tx) => {
        const lote = await tx.lote.findUnique({
            where: { id: Number(data.loteId) },
        });

        if (!lote) {
            throw new Error("Lote no encontrado");
        }

        const empaque = await tx.empaque.create({
            data: {
                loteId: Number(data.loteId),
                fechaInicio: new Date(data.fechaInicio),
                fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
                kilosIngresados,
                kilosResultantes,
                merma,
                observaciones: data.observaciones || null,
            },
            include: {
                lote: true,
            },
        });

        await tx.lote.update({
            where: { id: Number(data.loteId) },
            data: {
                estado: "EN_ALMACEN",
                kilosActuales: kilosResultantes,
            },
        });

        return empaque;
    });
}

export async function actualizarEmpaque(id: number, data: Partial<EmpaqueInput>) {
    return prisma.$transaction(async (tx) => {
        const empaqueExistente = await tx.empaque.findUnique({
            where: { id },
        });

        if (!empaqueExistente) {
            throw new Error("Proceso de empaque no encontrado");
        }

        const kilosIngresados = data.kilosIngresados !== undefined ? Number(data.kilosIngresados) : empaqueExistente.kilosIngresados;
        const kilosResultantes = data.kilosResultantes !== undefined ? Number(data.kilosResultantes) : empaqueExistente.kilosResultantes;
        const merma = kilosIngresados - kilosResultantes;
        const loteId = data.loteId !== undefined ? Number(data.loteId) : empaqueExistente.loteId;

        const empaqueActualizado = await tx.empaque.update({
            where: { id },
            data: {
                loteId,
                fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : undefined,
                fechaFin: data.fechaFin !== undefined ? (data.fechaFin ? new Date(data.fechaFin) : null) : undefined,
                kilosIngresados,
                kilosResultantes,
                merma,
                observaciones: data.observaciones !== undefined ? data.observaciones : undefined,
            },
            include: {
                lote: true,
            },
        });

        if (data.kilosResultantes !== undefined || data.loteId !== undefined) {
            await tx.lote.update({
                where: { id: loteId },
                data: {
                    estado: "EN_ALMACEN",
                    kilosActuales: kilosResultantes,
                },
            });
        }

        return empaqueActualizado;
    });
}

export async function eliminarEmpaque(id: number) {
    return prisma.empaque.delete({
        where: { id },
    });
}
