// src/modules/cosechas/cosechas.service.ts
import { prisma } from "../../config/prisma";

type CosechaInput = {
    fecha: string;
    kilosCosechados: number;
    cantidadCosechadores: number;
    lotes: string;
    totalHectareas: number;
    tipoCosecha: string;
};

export async function listarCosechas() {
    return prisma.cosecha.findMany({
        orderBy: {
            fecha: "desc",
        },
    });
}

export async function crearCosecha(data: CosechaInput) {
    return prisma.cosecha.create({
        data: {
            fecha: new Date(data.fecha),
            kilosCosechados: Number(data.kilosCosechados),
            cantidadCosechadores: Number(data.cantidadCosechadores),
            lotes: data.lotes,
            totalHectareas: Number(data.totalHectareas),
            tipoCosecha: data.tipoCosecha,
        },
    });
}

export async function actualizarCosecha(id: number, data: Partial<CosechaInput>) {
    return prisma.cosecha.update({
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
            ...(data.tipoCosecha !== undefined && { tipoCosecha: data.tipoCosecha }),
        },
    });
}

export async function eliminarCosecha(id: number) {
    return prisma.cosecha.delete({
        where: { id },
    });
}

export async function obtenerResumenCosechas() {
    const cosechas = await prisma.cosecha.findMany();

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