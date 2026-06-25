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
    seccionId?: number | null;
};

export async function listarCosechas() {
    return prisma.cosecha.findMany({
        include: {
            cosechaLotes: {
                include: {
                    lote: true,
                },
            },
            seccion: true,
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
            seccionId: data.seccionId !== undefined ? Number(data.seccionId) : null,

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
                ...(data.seccionId !== undefined && {
                    seccionId: data.seccionId === null ? null : Number(data.seccionId),
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

export async function compararSecciones(seccionesIds: number[]) {
    const [produccionTotal, produccionSecciones] = await Promise.all([
        prisma.cosecha.aggregate({
            _sum: { kilosCosechados: true },
        }),
        prisma.cosecha.aggregate({
            where: {
                seccionId: { in: seccionesIds },
            },
            _sum: { kilosCosechados: true },
        }),
    ]);

    const totalGeneral = produccionTotal._sum.kilosCosechados ?? 0;
    const totalSecciones = produccionSecciones._sum.kilosCosechados ?? 0;

    const porcentaje =
        totalGeneral > 0
            ? (totalSecciones / totalGeneral) * 100
            : 0;

    return {
        seccionesIds,
        totalGeneralKilos: totalGeneral,
        totalSeccionesKilos: totalSecciones,
        porcentaje: Number(porcentaje.toFixed(2)),
    };
}

export async function obtenerTopAportantes() {
    const [topKilos, topHectareas, todasCosechas] = await Promise.all([
        prisma.cosecha.findMany({
            orderBy: { kilosCosechados: "desc" },
            take: 3,
            include: { seccion: true },
        }),
        prisma.cosecha.findMany({
            orderBy: { totalHectareas: "desc" },
            take: 3,
            include: { seccion: true },
        }),
        prisma.cosecha.findMany({
            include: { seccion: true },
        }),
    ]);

    const conRendimiento = todasCosechas
        .map((cosecha) => ({
            id: cosecha.id,
            fecha: cosecha.fecha,
            kilosCosechados: cosecha.kilosCosechados,
            totalHectareas: cosecha.totalHectareas,
            tipoCosecha: cosecha.tipoCosecha,
            seccion: cosecha.seccion,
            rendimiento:
                cosecha.totalHectareas > 0
                    ? cosecha.kilosCosechados / cosecha.totalHectareas
                    : 0,
        }))
        .sort((a, b) => b.rendimiento - a.rendimiento)
        .slice(0, 3);

    return {
        topKilos,
        topHectareas,
        topRendimiento: conRendimiento,
    };
}