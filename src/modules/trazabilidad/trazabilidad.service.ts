// src/modules/trazabilidad/trazabilidad.service.ts
import { prisma } from "../../config/prisma";

type ProcesoInput = {
    fecha: string;
    cosechaId: number;
    etapa: string;
    kilosIngresados: number;
    kilosResultantes: number;
};

export async function listarProcesos() {
    return prisma.procesoTrazabilidad.findMany({
        include: {
            cosecha: true,
        },
        orderBy: {
            fecha: "desc",
        },
    });
}

export async function crearProceso(data: ProcesoInput) {
    const kilosIngresados = Number(data.kilosIngresados);
    const kilosResultantes = Number(data.kilosResultantes);

    const porcentajeMerma =
        kilosIngresados > 0
            ? ((kilosIngresados - kilosResultantes) / kilosIngresados) * 100
            : 0;

    return prisma.procesoTrazabilidad.create({
        data: {
            fecha: new Date(data.fecha),
            cosechaId: Number(data.cosechaId),
            etapa: data.etapa,
            kilosIngresados,
            kilosResultantes,
            porcentajeMerma,
        },
        include: {
            cosecha: true,
        },
    });
}

export async function obtenerResumenTrazabilidad() {
    const procesos = await prisma.procesoTrazabilidad.findMany();

    const totalIngresado = procesos.reduce(
        (total, proceso) => total + proceso.kilosIngresados,
        0,
    );

    const totalResultante = procesos.reduce(
        (total, proceso) => total + proceso.kilosResultantes,
        0,
    );

    const mermaPromedio =
        procesos.length > 0
            ? procesos.reduce((total, proceso) => total + proceso.porcentajeMerma, 0) /
            procesos.length
            : 0;

    return {
        totalProcesos: procesos.length,
        totalIngresado,
        totalResultante,
        mermaPromedio,
    };
}