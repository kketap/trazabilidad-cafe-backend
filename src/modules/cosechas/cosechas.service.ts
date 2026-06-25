// src/modules/cosechas/cosechas.service.ts
import { prisma } from "../../config/prisma";

type CosechaInput = {
    fecha: string;
    kilosCosechados: number;
    cantidadCosechadores: number;
    lotes?: string;
    loteIds?: number[];
    totalHectareas: number;
    tipoCosecha: string;
};

export async function listarCosechas() {
    return prisma.cosecha.findMany({
        include: {
            cosechaLotes: {
                include: {
                    lote: true,
                },
            },
        },
        orderBy: {
            fecha: "desc",
        },
    });
}

export async function crearCosecha(data: CosechaInput) {
    const loteIds = data.loteIds ?? [];

    const lotesTexto =
        data.lotes ||
        (loteIds.length > 0
            ? `Lotes seleccionados: ${loteIds.join(", ")}`
            : "");

    return prisma.cosecha.create({
        data: {
            fecha: new Date(data.fecha),
            kilosCosechados: Number(data.kilosCosechados),
            cantidadCosechadores: Number(data.cantidadCosechadores),
            lotes: lotesTexto,
            totalHectareas: Number(data.totalHectareas),
            tipoCosecha: data.tipoCosecha,

            cosechaLotes: {
                create: loteIds.map((loteId) => ({
                    lote: {
                        connect: {
                            id: Number(loteId),
                        },
                    },
                })),
            },
        },
        include: {
            cosechaLotes: {
                include: {
                    lote: true,
                },
            },
        },
    });
}

export async function actualizarCosecha(id: number, data: Partial<CosechaInput>) {
    const loteIds = data.loteIds;

    return prisma.$transaction(async (tx) => {
        const cosechaActualizada = await tx.cosecha.update({
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
                ...(data.tipoCosecha !== undefined && {
                    tipoCosecha: data.tipoCosecha,
                }),
            },
        });

        if (loteIds !== undefined) {
            await tx.cosechaLote.deleteMany({
                where: {
                    cosechaId: id,
                },
            });

            if (loteIds.length > 0) {
                await tx.cosechaLote.createMany({
                    data: loteIds.map((loteId) => ({
                        cosechaId: id,
                        loteId: Number(loteId),
                    })),
                    skipDuplicates: true,
                });
            }
        }

        return tx.cosecha.findUnique({
            where: { id },
            include: {
                cosechaLotes: {
                    include: {
                        lote: true,
                    },
                },
            },
        });
    });
}

export async function eliminarCosecha(id: number) {
    return prisma.cosecha.delete({
        where: { id },
    });
}

type ResumenFiltros = {
    desde?: Date;
    hasta?: Date;
};

export async function obtenerResumenCosechas(filtros: ResumenFiltros = {}) {
    const cosechas = await prisma.cosecha.findMany({
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

    const kilosTotales = cosechas.reduce(
        (total, cosecha) => total + cosecha.kilosCosechados,
        0,
    );

    const totalHectareas = cosechas.reduce(
        (total, cosecha) => total + cosecha.totalHectareas,
        0,
    );

    const rendimiento =
        totalHectareas > 0 ? kilosTotales / totalHectareas : 0;

    return {
        totalCosechas: cosechas.length,
        kilosTotales,
        totalHectareas,
        rendimiento,
    };
}