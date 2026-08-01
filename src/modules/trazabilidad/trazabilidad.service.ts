// src/modules/trazabilidad/trazabilidad.service.ts
import { prisma } from "../../config/prisma";

/**
 * Entrada para crear o actualizar procesos de trazabilidad.
 *
 * loteId es la nueva relación principal.
 * cosechaId queda opcional para mantener compatibilidad con registros antiguos.
 */
type ProcesoInput = {
    fecha: string;
    loteId?: number | null;
    cosechaId?: number | null;
    etapa?: string;
    tipoProceso?: string;
    kilosIngresados: number;
    kilosResultantes?: number;
    codigo?: string;
    duracionHoras?: number;
    fechaInicio?: string;
    fechaFin?: string;
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

function calculateDurationHours(start?: string | Date | null, end?: string | Date | null, fallback: number = 0): number {
    if (start && end) {
        const diff = new Date(end).getTime() - new Date(start).getTime();
        if (diff > 0) return diff / (1000 * 60 * 60);
    }
    return fallback;
}

export async function crearProceso(data: ProcesoInput) {
    const kilosIngresados = Number(data.kilosIngresados);

    const codigo = data.codigo || `PROC-${Date.now()}`;
    const duracionHoras = calculateDurationHours(data.fechaInicio, data.fechaFin, data.duracionHoras !== undefined ? Number(data.duracionHoras) : 0);
    const fechaInicio = data.fechaInicio ? new Date(data.fechaInicio) : undefined;
    const fechaFin = data.fechaFin ? new Date(data.fechaFin) : undefined;
    const tipoProcesoStr = data.tipoProceso as any;

    return prisma.procesoTrazabilidad.create({
        data: {
            fecha: new Date(data.fecha),
            loteId: data.loteId ? Number(data.loteId) : null,
            cosechaId: data.cosechaId ? Number(data.cosechaId) : null,
            etapa: data.etapa,
            tipoProceso: tipoProcesoStr,
            kilosIngresados,
            codigo,
            duracionHoras,
            fechaInicio,
            fechaFin,
        },
        include: {
            cosecha: true,
            Lote: true,
        },
    });

    if (!lote) {
        throw new Error("El lote seleccionado no existe");
    }

    if (!lote.activo) {
        throw new Error("El lote seleccionado se encuentra inactivo");
    }

    const fechaProcesoKey = getFechaKey(data.fecha);

    const cosechaRelacionada = lote.cosechaLotes.find(
        (relacion) =>
            getFechaKey(relacion.cosecha.fecha) ===
            fechaProcesoKey,
    );

    if (!cosechaRelacionada) {
        throw new Error(
            "El lote seleccionado no está asociado a una cosecha de la fecha indicada",
        );
    }

    const kilosDisponibles =
        lote.kilosActuales ??
        lote.kilosIniciales;

    if (kilosDisponibles == null) {
        throw new Error(
            "El lote seleccionado no tiene kilos iniciales o actuales registrados",
        );
    }

    const porcentajeMerma = calcularPorcentajeMerma(
        kilosIngresados,
        kilosResultantes,
    );

    const { desde, hasta } = getDateRange(fecha);

    return prisma.$transaction(async (tx) => {
        const cantidadProcesosDia = await tx.procesoTrazabilidad.count({
            where: {
                fecha: {
                    gte: desde,
                    lt: hasta,
                },
            },
        });

        let correlativo = cantidadProcesosDia + 1;
        let codigo = buildProcesoCode(fecha, correlativo);

        /*
         * Evita fallos si anteriormente se eliminó algún proceso
         * o si ya existe un correlativo determinado.
         */
        while (
            await tx.procesoTrazabilidad.findUnique({
                where: {
                    codigo,
                },
                select: {
                    id: true,
                },
            })
        ) {
            correlativo += 1;
            codigo = buildProcesoCode(fecha, correlativo);
        }

        return tx.procesoTrazabilidad.create({
            data: {
                codigo,
                fecha,
                fechaInicio,
                duracionHoras,
                etapa: data.etapa.trim(),
                kilosIngresados,
                kilosResultantes,
                porcentajeMerma,

                loteId: lote.id,

                // Se obtiene automáticamente desde CosechaLote.
                cosechaId: cosechaRelacionada.cosechaId,
            },
            include: procesoInclude,
        });
    });
}

/**
 * Actualiza un proceso de trazabilidad.
 *
 * Si cambian kilosIngresados o kilosResultantes, se recalcula la merma.
 * Si solo cambia fecha, etapa o lote, mantiene la merma anterior.
 */
export async function actualizarProceso(
    id: number,
    data: Partial<ProcesoInput>,
) {
    const procesoActual = await prisma.procesoTrazabilidad.findUnique({
        where: { id },
    });

    if (!procesoActual) {
        throw new Error("Proceso no encontrado");
    }

    const kilosIngresados =
        data.kilosIngresados !== undefined ? Number(data.kilosIngresados) : undefined;

    const duracionHoras = data.fechaInicio && data.fechaFin 
        ? calculateDurationHours(data.fechaInicio, data.fechaFin) 
        : (data.duracionHoras !== undefined ? Number(data.duracionHoras) : undefined);

    return prisma.procesoTrazabilidad.update({
        where: { id },
        data: {
            ...(data.fecha && { fecha: new Date(data.fecha) }),
            ...(data.loteId !== undefined && { loteId: data.loteId ? Number(data.loteId) : null }),
            ...(data.cosechaId !== undefined && { cosechaId: data.cosechaId ? Number(data.cosechaId) : null }),
            ...(data.etapa !== undefined && { etapa: data.etapa }),
            ...(data.tipoProceso !== undefined && { tipoProceso: data.tipoProceso as any }),
            ...(kilosIngresados !== undefined && { kilosIngresados }),
            ...(data.codigo !== undefined && { codigo: data.codigo }),
            ...(duracionHoras !== undefined && { duracionHoras }),
            ...(data.fechaInicio !== undefined && { fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : null }),
            ...(data.fechaFin !== undefined && { fechaFin: data.fechaFin ? new Date(data.fechaFin) : null }),
        },
        include: {
            cosecha: true,
            Lote: true,
        },
    });
}
/**
 * Elimina un proceso de trazabilidad.
 */
export async function eliminarProceso(id: number) {
    return prisma.procesoTrazabilidad.delete({
        where: { id },
    });
}

/**
 * Obtiene resumen de trazabilidad para Home y métricas.
 */
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

    return {
        totalProcesos: procesos.length,
        totalIngresado,
    };
}