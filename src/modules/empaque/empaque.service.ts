// src/modules/empaque/empaque.service.ts
import { prisma } from "../../config/prisma";

export type EmpaqueInput = {
    loteId: number;
    secadoId?: number | null;
    fechaInicio: string | Date;
    fechaFin?: string | Date | null;
    kilosIngresados: number;
    kilosResultantes: number;
    tipoEmpaque?: string | null;
    cantidadEmpaques?: number | null;
    rendimiento?: number | null;
    observaciones?: string | null;
    humedad?: number | null;
    actividadAgua?: number | null;
    puntajeSca?: number | null;
    perfilSensorial?: string | null;
    fueCatado?: boolean | null;
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
                ...(data.secadoId ? { secadoId: Number(data.secadoId) } : {}),
                fechaInicio: new Date(data.fechaInicio),
                fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
                kilosIngresados,
                kilosResultantes,
                merma,
                tipoEmpaque: data.tipoEmpaque?.trim() ?? null,
                cantidadEmpaques: data.cantidadEmpaques != null ? Number(data.cantidadEmpaques) : null,
                rendimiento: data.rendimiento != null ? Number(data.rendimiento) : null,
                observaciones: data.observaciones || null,
                humedad: data.humedad != null ? Number(data.humedad) : null,
                actividadAgua: data.actividadAgua != null ? Number(data.actividadAgua) : null,
                puntajeSca: data.puntajeSca != null ? Number(data.puntajeSca) : null,
                perfilSensorial: data.perfilSensorial?.trim() || null,
                fueCatado: data.fueCatado ?? null,
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
                ...(loteId ? { lote: { connect: { id: loteId } } } : {}),
                ...(data.secadoId !== undefined ? (data.secadoId ? { secado: { connect: { id: Number(data.secadoId) } } } : { secado: { disconnect: true } }) : {}),
                fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : undefined,
                fechaFin: data.fechaFin !== undefined ? (data.fechaFin ? new Date(data.fechaFin) : null) : undefined,
                kilosIngresados,
                kilosResultantes,
                merma,
                ...(data.tipoEmpaque !== undefined && { tipoEmpaque: data.tipoEmpaque?.trim() ?? null }),
                ...(data.cantidadEmpaques !== undefined && { cantidadEmpaques: data.cantidadEmpaques != null ? Number(data.cantidadEmpaques) : null }),
                ...(data.rendimiento !== undefined && { rendimiento: data.rendimiento != null ? Number(data.rendimiento) : null }),
                observaciones: data.observaciones !== undefined ? data.observaciones : undefined,
                ...(data.humedad !== undefined && { humedad: data.humedad != null ? Number(data.humedad) : null }),
                ...(data.actividadAgua !== undefined && { actividadAgua: data.actividadAgua != null ? Number(data.actividadAgua) : null }),
                ...(data.puntajeSca !== undefined && { puntajeSca: data.puntajeSca != null ? Number(data.puntajeSca) : null }),
                ...(data.perfilSensorial !== undefined && { perfilSensorial: data.perfilSensorial?.trim() || null }),
                ...(data.fueCatado !== undefined && { fueCatado: data.fueCatado }),
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
