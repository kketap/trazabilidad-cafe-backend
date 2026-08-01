// src/modules/trazabilidad/trazabilidad.service.ts
import { prisma } from "../../config/prisma";

type ProcesoInput = {
    fecha: string;
    loteId?: number | null;
    cosechaId?: number | null;
    etapa?: string | null;
    tipoProceso?: string | null;
    kilosIngresados: number;
    kilosResultantes?: number;
    codigo?: string;
    duracionHoras?: number;
    fechaInicio?: string | null;
    fechaFin?: string | null;
};

type ResumenFiltros = {
    desde?: Date;
    hasta?: Date;
};

const procesoInclude = {
    cosecha: true,
    Lote: {
        include: {
            cosechaLotes: {
                include: {
                    cosecha: true,
                },
            },
        },
    },
};

const TIPOS_PROCESO_VALIDOS = [
    "OXIDACION_CEREZA",
    "OXIDACION_MUCILAGO",
    "ANAEROBICO_CEREZA",
    "ANAEROBICO_MUCILAGO",
];

function calculateDurationHours(
    start?: string | Date | null,
    end?: string | Date | null,
    fallback = 0,
): number {
    if (start && end) {
        const diff = new Date(end).getTime() - new Date(start).getTime();

        if (diff > 0) {
            return diff / (1000 * 60 * 60);
        }
    }

    return fallback;
}

function getFechaKey(value: string | Date): string {
    const fecha = value instanceof Date ? value : new Date(value);

    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getDateRange(fecha: Date) {
    const desde = new Date(fecha);
    desde.setHours(0, 0, 0, 0);

    const hasta = new Date(desde);
    hasta.setDate(hasta.getDate() + 1);

    return {
        desde,
        hasta,
    };
}

function buildProcesoCode(fecha: Date, correlativo: number) {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `PRO-${year}${month}${day}-${String(correlativo).padStart(4, "0")}`;
}

function normalizeTipoProceso(tipoProceso?: string | null) {
    if (!tipoProceso) return null;

    if (!TIPOS_PROCESO_VALIDOS.includes(tipoProceso)) {
        throw new Error("El tipo de proceso no es válido");
    }

    return tipoProceso as any;
}

export async function listarProcesos() {
    return prisma.procesoTrazabilidad.findMany({
        include: procesoInclude,
        orderBy: {
            fecha: "desc",
        },
    });
}

export async function crearProceso(data: ProcesoInput) {
    const kilosIngresados = Number(data.kilosIngresados);

    if (!Number.isFinite(kilosIngresados) || kilosIngresados <= 0) {
        throw new Error("Los kilos ingresados deben ser mayores que cero");
    }

    const fecha = new Date(data.fecha);

    if (Number.isNaN(fecha.getTime())) {
        throw new Error("La fecha del proceso no es válida");
    }

    const fechaInicio = data.fechaInicio ? new Date(data.fechaInicio) : null;
    const fechaFin = data.fechaFin ? new Date(data.fechaFin) : null;

    if (fechaInicio && Number.isNaN(fechaInicio.getTime())) {
        throw new Error("La fecha de inicio no es válida");
    }

    if (fechaFin && Number.isNaN(fechaFin.getTime())) {
        throw new Error("La fecha de fin no es válida");
    }

    const duracionHoras = calculateDurationHours(
        fechaInicio,
        fechaFin,
        data.duracionHoras !== undefined ? Number(data.duracionHoras) : 0,
    );

    if (!Number.isFinite(duracionHoras) || duracionHoras < 0) {
        throw new Error("La duración del proceso no es válida");
    }

    const tipoProceso = normalizeTipoProceso(data.tipoProceso);

    let cosechaIdFinal =
        data.cosechaId !== undefined && data.cosechaId !== null
            ? Number(data.cosechaId)
            : null;

    let loteIdFinal =
        data.loteId !== undefined && data.loteId !== null
            ? Number(data.loteId)
            : null;

    if (loteIdFinal) {
        const lote = await prisma.lote.findUnique({
            where: {
                id: loteIdFinal,
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

        const kilosDisponibles = lote.kilosActuales ?? lote.kilosIniciales;

        if (kilosDisponibles != null && kilosIngresados > kilosDisponibles) {
            throw new Error(
                `Los kilos ingresados no pueden superar los kilos disponibles del lote (${kilosDisponibles} kg)`,
            );
        }

        if (!cosechaIdFinal) {
            const fechaProcesoKey = getFechaKey(fecha);

            const cosechaRelacionada = lote.cosechaLotes.find(
                (relacion) =>
                    getFechaKey(relacion.cosecha.fecha) === fechaProcesoKey,
            );

            if (cosechaRelacionada) {
                cosechaIdFinal = cosechaRelacionada.cosechaId;
            }
        }
    }

    return prisma.$transaction(async (tx) => {
        let codigo = data.codigo?.trim();

        if (!codigo) {
            const { desde, hasta } = getDateRange(fecha);

            const cantidadProcesosDia = await tx.procesoTrazabilidad.count({
                where: {
                    fecha: {
                        gte: desde,
                        lt: hasta,
                    },
                },
            });

            let correlativo = cantidadProcesosDia + 1;
            codigo = buildProcesoCode(fecha, correlativo);

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
        }

        return tx.procesoTrazabilidad.create({
            data: {
                codigo,
                fecha,
                fechaInicio,
                fechaFin,
                duracionHoras,
                etapa: data.etapa?.trim() || null,
                tipoProceso,
                kilosIngresados,
                loteId: loteIdFinal,
                cosechaId: cosechaIdFinal,
            },
            include: procesoInclude,
        });
    });
}

export async function actualizarProceso(
    id: number,
    data: Partial<ProcesoInput>,
) {
    const procesoActual = await prisma.procesoTrazabilidad.findUnique({
        where: {
            id,
        },
    });

    if (!procesoActual) {
        throw new Error("Proceso no encontrado");
    }

    const kilosIngresados =
        data.kilosIngresados !== undefined
            ? Number(data.kilosIngresados)
            : undefined;

    if (
        kilosIngresados !== undefined &&
        (!Number.isFinite(kilosIngresados) || kilosIngresados <= 0)
    ) {
        throw new Error("Los kilos ingresados deben ser mayores que cero");
    }

    const fechaInicio =
        data.fechaInicio !== undefined
            ? data.fechaInicio
                ? new Date(data.fechaInicio)
                : null
            : undefined;

    const fechaFin =
        data.fechaFin !== undefined
            ? data.fechaFin
                ? new Date(data.fechaFin)
                : null
            : undefined;

    const duracionHoras =
        data.fechaInicio && data.fechaFin
            ? calculateDurationHours(data.fechaInicio, data.fechaFin)
            : data.duracionHoras !== undefined
                ? Number(data.duracionHoras)
                : undefined;

    const tipoProceso =
        data.tipoProceso !== undefined
            ? normalizeTipoProceso(data.tipoProceso)
            : undefined;

    return prisma.procesoTrazabilidad.update({
        where: {
            id,
        },
        data: {
            ...(data.fecha && {
                fecha: new Date(data.fecha),
            }),
            ...(data.loteId !== undefined && {
                loteId: data.loteId ? Number(data.loteId) : null,
            }),
            ...(data.cosechaId !== undefined && {
                cosechaId: data.cosechaId ? Number(data.cosechaId) : null,
            }),
            ...(data.etapa !== undefined && {
                etapa: data.etapa?.trim() || null,
            }),
            ...(tipoProceso !== undefined && {
                tipoProceso,
            }),
            ...(kilosIngresados !== undefined && {
                kilosIngresados,
            }),
            ...(data.codigo !== undefined && {
                codigo: data.codigo.trim(),
            }),
            ...(duracionHoras !== undefined && {
                duracionHoras,
            }),
            ...(fechaInicio !== undefined && {
                fechaInicio,
            }),
            ...(fechaFin !== undefined && {
                fechaFin,
            }),
        },
    });
}

export async function eliminarProceso(id: number) {
    return prisma.procesoTrazabilidad.delete({
        where: {
            id,
        },
    });
}

export async function obtenerResumenTrazabilidad(
    filtros: ResumenFiltros = {},
) {
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
        (total, proceso) => total + Number(proceso.kilosIngresados ?? 0),
        0,
    );

    return {
        totalProcesos: procesos.length,
        totalIngresado,

        // Tu schema actual no tiene kilosResultantes ni porcentajeMerma.
        // Por eso se devuelven en 0 para no romper el Home.
        totalResultante: 0,
        mermaPromedio: 0,
    };
}