// src/modules/secado/secado.service.ts
import { prisma } from "../../config/prisma";

export type SecadoInput = {
    loteId: number;
    fechaInicio: string | Date;
    fechaFin?: string | Date | null;
    kilosIngresados: number;
    kilosResultantes: number;
    observaciones?: string | null;
};

export async function listarSecados() {
    return prisma.secado.findMany({
        include: {
            lote: true,
        },
        orderBy: {
            id: "desc",
        },
    });
}

export async function obtenerSecadoPorId(id: number) {
    return prisma.secado.findUnique({
        where: { id },
        include: {
            lote: true,
        },
    });
}

export async function crearSecado(data: SecadoInput) {
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

        const secado = await tx.secado.create({
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
                estado: "EN_SECADO",
                kilosActuales: kilosResultantes,
            },
        });

        return secado;
    });
}

export async function actualizarSecado(id: number, data: Partial<SecadoInput>) {
    return prisma.$transaction(async (tx) => {
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

export async function eliminarSecado(id: number) {
    return prisma.secado.delete({
        where: { id },
    });
}
