// src/modules/trazabilidad/trazabilidad.service.ts
import { prisma } from "../../config/prisma";

type ProcesoInput = {
    fecha: string;
    loteId?: number | null;
    cosechaId?: number | null;
    etapa: string;
    kilosIngresados: number;
    kilosResultantes: number;
    codigo?: string;
    duracionHoras?: number;
    fechaInicio?: string;
};

export async function listarProcesos() {
    return prisma.procesoTrazabilidad.findMany({
        include: {
            cosecha: true,
            Lote: true,
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

    const codigo = data.codigo || `PROC-${Date.now()}`;
    const duracionHoras = data.duracionHoras !== undefined ? Number(data.duracionHoras) : 0;
    const fechaInicio = data.fechaInicio ? new Date(data.fechaInicio) : new Date(data.fecha);

    return prisma.procesoTrazabilidad.create({
        data: {
            fecha: new Date(data.fecha),
            loteId: data.loteId ? Number(data.loteId) : null,
            cosechaId: data.cosechaId ? Number(data.cosechaId) : null,
            etapa: data.etapa,
            kilosIngresados,
            kilosResultantes,
            porcentajeMerma,
            codigo,
            duracionHoras,
            fechaInicio,
        },
        include: {
            cosecha: true,
            Lote: true,
        },
    });
}

export async function actualizarProceso(id: number, data: Partial<ProcesoInput>) {
    const kilosIngresados =
        data.kilosIngresados !== undefined ? Number(data.kilosIngresados) : undefined;
    const kilosResultantes =
        data.kilosResultantes !== undefined ? Number(data.kilosResultantes) : undefined;

    let porcentajeMerma: number | undefined;
    if (kilosIngresados !== undefined && kilosResultantes !== undefined) {
        porcentajeMerma =
            kilosIngresados > 0
                ? ((kilosIngresados - kilosResultantes) / kilosIngresados) * 100
                : 0;
    }

    return prisma.procesoTrazabilidad.update({
        where: { id },
        data: {
            ...(data.fecha && { fecha: new Date(data.fecha) }),
            ...(data.loteId !== undefined && { loteId: data.loteId ? Number(data.loteId) : null }),
            ...(data.cosechaId !== undefined && { cosechaId: data.cosechaId ? Number(data.cosechaId) : null }),
            ...(data.etapa !== undefined && { etapa: data.etapa }),
            ...(kilosIngresados !== undefined && { kilosIngresados }),
            ...(kilosResultantes !== undefined && { kilosResultantes }),
            ...(porcentajeMerma !== undefined && { porcentajeMerma }),
            ...(data.codigo !== undefined && { codigo: data.codigo }),
            ...(data.duracionHoras !== undefined && { duracionHoras: Number(data.duracionHoras) }),
            ...(data.fechaInicio && { fechaInicio: new Date(data.fechaInicio) }),
        },
        include: {
            cosecha: true,
            Lote: true,
        },
    });
}

export async function eliminarProceso(id: number) {
    return prisma.procesoTrazabilidad.delete({
        where: { id },
    });
}

type ResumenFiltros = {
    desde?: Date;
    hasta?: Date;
};

export async function obtenerResumenTrazabilidad(filtros: ResumenFiltros = {}) {
    const procesos = await prisma.procesoTrazabilidad.findMany({
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
            ? procesos.reduce(
                (total, proceso) => total + proceso.porcentajeMerma,
                0,
            ) / procesos.length
            : 0;

    return {
        totalProcesos: procesos.length,
        totalIngresado,
        totalResultante,
        mermaPromedio,
    };
}