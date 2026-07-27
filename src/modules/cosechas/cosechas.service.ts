// src/modules/cosechas/cosechas.service.ts
import { prisma } from "../../config/prisma";

export type CosechaInput = {
    fecha: string;
    kilosCosechados: number;
    cantidadCosechadores: number;
    lotes?: string;
    loteIds?: number[];
    totalHectareas: number;
    tipoCosecha?: string;
    trabajadorId: number;
    tipo_cosecha?: string;
    kilos_diarios?: number;
    kilos_quincena?: number;
    kilos_mensuales?: number;
};

export async function listarCosechas() {
    return prisma.cosecha.findMany({
        include: {
            trabajador: true,
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

export async function obtenerCosechaPorId(id: number) {
    return prisma.cosecha.findUnique({
        where: { id },
        include: {
            trabajador: true,
            cosechaLotes: {
                include: {
                    lote: true,
                },
            },
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

    const tipoCosechaFinal = data.tipo_cosecha || data.tipoCosecha || "plena";

    return prisma.cosecha.create({
        data: {
            fecha: new Date(data.fecha),
            kilosCosechados: Number(data.kilosCosechados),
            cantidadCosechadores: Number(data.cantidadCosechadores),
            lotes: lotesTexto,
            totalHectareas: Number(data.totalHectareas),
            tipoCosecha: tipoCosechaFinal,
            trabajadorId: Number(data.trabajadorId),
            tipo_cosecha: tipoCosechaFinal,
            kilos_diarios: data.kilos_diarios !== undefined ? Number(data.kilos_diarios) : null,
            kilos_quincena: data.kilos_quincena !== undefined ? Number(data.kilos_quincena) : null,
            kilos_mensuales: data.kilos_mensuales !== undefined ? Number(data.kilos_mensuales) : null,

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
            trabajador: true,
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
    const tipoCosechaFinal = data.tipo_cosecha || data.tipoCosecha;

    return prisma.$transaction(async (tx) => {
        await tx.cosecha.update({
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
                ...(tipoCosechaFinal !== undefined && {
                    tipoCosecha: tipoCosechaFinal,
                    tipo_cosecha: tipoCosechaFinal,
                }),
                ...(data.trabajadorId !== undefined && {
                    trabajadorId: Number(data.trabajadorId),
                }),
                ...(data.kilos_diarios !== undefined && {
                    kilos_diarios: data.kilos_diarios ? Number(data.kilos_diarios) : null,
                }),
                ...(data.kilos_quincena !== undefined && {
                    kilos_quincena: data.kilos_quincena ? Number(data.kilos_quincena) : null,
                }),
                ...(data.kilos_mensuales !== undefined && {
                    kilos_mensuales: data.kilos_mensuales ? Number(data.kilos_mensuales) : null,
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
                trabajador: true,
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
