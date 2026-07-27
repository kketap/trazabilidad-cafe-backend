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
    fechaInicio: string;
    duracionHoras: number;

    loteId?: number | null;
    cosechaId?: number | null;

    etapa: string;
    kilosIngresados: number;
    kilosResultantes: number;
};

type ResumenFiltros = {
    desde?: Date;
    hasta?: Date;
};

/**
 * Calcula el porcentaje de merma del proceso.
 *
 * Fórmula:
 * ((kilos ingresados - kilos resultantes) / kilos ingresados) * 100
 */
function calcularPorcentajeMerma(
    kilosIngresados: number,
    kilosResultantes: number,
): number {
    if (kilosIngresados <= 0) {
        return 0;
    }

    return ((kilosIngresados - kilosResultantes) / kilosIngresados) * 100;
}

function getFechaKey(fecha: Date | string): string {
    if (typeof fecha === "string") {
        return fecha.slice(0, 10);
    }

    return fecha.toISOString().slice(0, 10);
}

/**
 * Include reutilizable para traer las relaciones necesarias.
 *
 * lote:
 * - Nueva relación principal para trazabilidad real por lote productivo.
 *
 * cosecha:
 * - Se mantiene para procesos antiguos.
 * - Incluye cosechaLotes para mostrar lotes asociados históricamente.
 */
const procesoInclude = {
    lote: {
        include: {
            cosechaLotes: {
                include: {
                    cosecha: true,
                },
            },
        },
    },
    cosecha: {
        include: {
            cosechaLotes: {
                include: {
                    lote: true,
                },
            },
        },
    },
};

/**
 * Lista todos los procesos de trazabilidad.
 */
export async function listarProcesos() {
    return prisma.procesoTrazabilidad.findMany({
        include: procesoInclude,
        orderBy: {
            fecha: "desc",
        },
    });
}

function getDateRange(fecha: Date) {
    const desde = new Date(fecha);
    desde.setHours(0, 0, 0, 0);

    const hasta = new Date(desde);
    hasta.setDate(hasta.getDate() + 1);

    return { desde, hasta };
}

function buildProcesoCode(fecha: Date, correlativo: number) {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `PRO-${year}${month}${day}-${String(correlativo).padStart(4, "0")}`;
}

/**
 * Crea un proceso de trazabilidad.
 *
 * Reglas:
 * - Debe existir loteId o cosechaId.
 * - kilosResultantes no puede ser mayor a kilosIngresados.
 * - La merma se calcula automáticamente.
 */
export async function crearProceso(data: ProcesoInput) {
    const kilosIngresados = Number(data.kilosIngresados);
    const kilosResultantes = Number(data.kilosResultantes);
    const duracionHoras = Number(data.duracionHoras);

    if (!data.loteId) {
        throw new Error("Debe seleccionar un lote para registrar el proceso");
    }

    if (!Number.isFinite(kilosIngresados) || kilosIngresados <= 0) {
        throw new Error("Los kilos ingresados deben ser mayores que cero");
    }

    if (!Number.isFinite(kilosResultantes) || kilosResultantes < 0) {
        throw new Error("Los kilos resultantes no pueden ser negativos");
    }

    if (kilosResultantes > kilosIngresados) {
        throw new Error(
            "Los kilos resultantes no pueden ser mayores que los kilos ingresados",
        );
    }

    if (!Number.isFinite(duracionHoras) || duracionHoras <= 0) {
        throw new Error("La duración debe ser mayor que cero");
    }

    const fecha = new Date(data.fecha);
    const fechaInicio = new Date(data.fechaInicio);

    if (Number.isNaN(fecha.getTime())) {
        throw new Error("La fecha del proceso no es válida");
    }

    if (Number.isNaN(fechaInicio.getTime())) {
        throw new Error("La fecha de inicio no es válida");
    }

    const lote = await prisma.lote.findUnique({
        where: {
            id: Number(data.loteId),
        },
        include: {
            cosechaLotes: {
                include: {
                    cosecha: true,
                },
            },
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
        data.kilosIngresados !== undefined
            ? Number(data.kilosIngresados)
            : procesoActual.kilosIngresados;

    const kilosResultantes =
        data.kilosResultantes !== undefined
            ? Number(data.kilosResultantes)
            : procesoActual.kilosResultantes;

    const duracionHoras =
        data.duracionHoras !== undefined
            ? Number(data.duracionHoras)
            : procesoActual.duracionHoras;

    if (kilosIngresados <= 0) {
        throw new Error("Los kilos ingresados deben ser mayores que cero");
    }

    if (kilosResultantes < 0) {
        throw new Error("Los kilos resultantes no pueden ser negativos");
    }

    if (kilosResultantes > kilosIngresados) {
        throw new Error(
            "Los kilos resultantes no pueden ser mayores que los kilos ingresados",
        );
    }

    if (duracionHoras !== null && duracionHoras <= 0) {
        throw new Error("La duración debe ser mayor que cero");
    }

    const loteId =
        data.loteId !== undefined
            ? data.loteId
            : procesoActual.loteId;

    let cosechaId = procesoActual.cosechaId;

    if (loteId) {
        const lote = await prisma.lote.findUnique({
            where: {
                id: Number(loteId),
            },
            include: {
                cosechaLotes: {
                    include: {
                        cosecha: true,
                    },
                },
            },
        });

        if (!lote) {
            throw new Error("El lote seleccionado no existe");
        }

        const fechaReferenciaKey = data.fecha
            ? getFechaKey(data.fecha)
            : getFechaKey(procesoActual.fecha);

        const relacionCosecha = lote.cosechaLotes.find(
            (relacion) =>
                getFechaKey(relacion.cosecha.fecha) ===
                fechaReferenciaKey,
        );

        if (!relacionCosecha) {
            throw new Error(
                "El lote no está asociado a una cosecha de la fecha seleccionada",
            );
        }

        cosechaId = relacionCosecha.cosechaId;
    }

    const debeRecalcularMerma =
        data.kilosIngresados !== undefined ||
        data.kilosResultantes !== undefined;

    return prisma.procesoTrazabilidad.update({
        where: { id },
        data: {
            ...(data.fecha !== undefined && {
                fecha: new Date(data.fecha),
            }),

            ...(data.fechaInicio !== undefined && {
                fechaInicio: new Date(data.fechaInicio),
            }),

            ...(data.duracionHoras !== undefined && {
                duracionHoras,
            }),

            ...(data.etapa !== undefined && {
                etapa: data.etapa.trim(),
            }),

            ...(data.loteId !== undefined && {
                loteId:
                    data.loteId !== null
                        ? Number(data.loteId)
                        : null,
            }),

            cosechaId,

            ...(data.kilosIngresados !== undefined && {
                kilosIngresados,
            }),

            ...(data.kilosResultantes !== undefined && {
                kilosResultantes,
            }),

            ...(debeRecalcularMerma && {
                porcentajeMerma: calcularPorcentajeMerma(
                    kilosIngresados,
                    kilosResultantes,
                ),
            }),
        },
        include: procesoInclude,
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