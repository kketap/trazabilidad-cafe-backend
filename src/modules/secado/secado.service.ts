// src/modules/secado/secado.service.ts
import { prisma } from "../../config/prisma";

export type SecadoLoteItem = {
    loteId: number;
    kilosUsados: number;
};

export type SecadoInput = {
    codigo?: string;
    loteId?: number;
    lotes?: SecadoLoteItem[];
    fechaInicio: string | Date;
    fechaFin?: string | Date | null;
    kilosIngresados: number;
    kilosResultantes: number;
    observaciones?: string | null;
    perfilProceso?: string | null;
    secadora?: string | null;
    tempMinima?: number | null;
    tempMaxima?: number | null;
};

const secadoIncludeDefault = {
    lote: true,
    secadoLotes: {
        include: {
            lote: true,
        },
    },
};

/**
 * Genera el siguiente código de secado, por ejemplo SEC-NAT-001 o SEC-001.
 */
async function generarCodigoSecado(perfil?: string | null): Promise<string> {
    const prefijo = perfil ? `SEC-${perfil.toUpperCase().slice(0, 3)}` : "SEC";
    const secadosExistentes = await prisma.secado.findMany({
        where: {
            codigo: { startsWith: `${prefijo}-` },
        },
        select: { codigo: true },
    });

    const numerosUsados = secadosExistentes
        .map((s) => {
            if (!s.codigo) return 0;
            const partes = s.codigo.split("-");
            const num = Number(partes[partes.length - 1]);
            return Number.isNaN(num) ? 0 : num;
        })
        .filter((n) => n > 0);

    const siguiente = numerosUsados.length > 0 ? Math.max(...numerosUsados) + 1 : 1;
    return `${prefijo}-${String(siguiente).padStart(3, "0")}`;
}

export async function listarSecados() {
    return prisma.secado.findMany({
        include: secadoIncludeDefault,
        orderBy: {
            id: "desc",
        },
    });
}

export async function obtenerSecadoPorId(id: number) {
    return prisma.secado.findUnique({
        where: { id },
        include: secadoIncludeDefault,
    });
}

export async function crearSecado(data: SecadoInput) {
    const kilosIngresados = Number(data.kilosIngresados);
    const kilosResultantes = Number(data.kilosResultantes);

    if (!Number.isFinite(kilosIngresados) || kilosIngresados <= 0) {
        throw new Error("Los kilos ingresados deben ser mayores que cero");
    }

    if (!Number.isFinite(kilosResultantes) || kilosResultantes < 0) {
        throw new Error("Los kilos resultantes no pueden ser negativos");
    }

    const merma = kilosIngresados - kilosResultantes;

    const secadora =
        data.secadora !== undefined && data.secadora !== null
            ? String(data.secadora).trim() || null
            : null;

    const tempMinima =
        data.tempMinima !== undefined && data.tempMinima !== null
            ? Number(data.tempMinima)
            : null;

    const tempMaxima =
        data.tempMaxima !== undefined && data.tempMaxima !== null
            ? Number(data.tempMaxima)
            : null;

    if (tempMinima !== null && !Number.isFinite(tempMinima)) {
        throw new Error("La temperatura mínima debe ser un valor numérico válido");
    }

    if (tempMaxima !== null && !Number.isFinite(tempMaxima)) {
        throw new Error("La temperatura máxima debe ser un valor numérico válido");
    }

    if (tempMinima !== null && tempMaxima !== null && tempMinima > tempMaxima) {
        throw new Error("La temperatura mínima no puede ser mayor que la temperatura máxima");
    }

    const lotesInput =
        Array.isArray(data.lotes) && data.lotes.length > 0
            ? data.lotes.filter(
                (l) => Number(l.loteId) > 0 && Number(l.kilosUsados) > 0
            )
            : data.loteId
                ? [{ loteId: Number(data.loteId), kilosUsados: kilosIngresados }]
                : [];

    if (lotesInput.length === 0) {
        throw new Error("Debe seleccionar al menos un lote de origen válido");
    }

    return prisma.$transaction(async (tx) => {
        // Validar y descontar saldo de cada lote húmedo involucrado
        for (const item of lotesInput) {
            const lote = await tx.lote.findUnique({
                where: { id: Number(item.loteId) },
            });

            if (!lote) {
                throw new Error(`El lote ID ${item.loteId} no fue encontrado`);
            }

            if (!lote.activo) {
                throw new Error(`El lote ${lote.codigo} se encuentra inactivo`);
            }

            const disponibles = lote.kilosActuales ?? lote.kilosIniciales ?? 0;
            const kilosAUsar = Number(item.kilosUsados);

            if (kilosAUsar > disponibles) {
                throw new Error(
                    `Los kilos ingresados para el lote ${lote.codigo} (${kilosAUsar} kg) superan los disponibles (${disponibles} kg)`
                );
            }

            const nuevoSaldoLote = Math.max(0, Number((disponibles - kilosAUsar).toFixed(2)));
            const nuevoEstadoLote = nuevoSaldoLote === 0 ? "EN_SECADO" : "EN_PROCESO";

            await tx.lote.update({
                where: { id: lote.id },
                data: {
                    kilosActuales: nuevoSaldoLote,
                    estado: nuevoEstadoLote,
                },
            });
        }

        const codigo =
            data.codigo?.trim() ||
            (await generarCodigoSecado(data.perfilProceso));

        const primaryLoteId = lotesInput[0].loteId;

        const secado = await tx.secado.create({
            data: {
                codigo,
                loteId: primaryLoteId,
                fechaInicio: new Date(data.fechaInicio),
                fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
                kilosIngresados,
                kilosResultantes,
                merma,
                observaciones: data.observaciones || null,
                perfilProceso: (data.perfilProceso as any) || null,
                secadora,
                tempMinima,
                tempMaxima,
                secadoLotes: {
                    create: lotesInput.map((l) => ({
                        loteId: Number(l.loteId),
                        kilosUsados: Number(l.kilosUsados),
                    })),
                },
            },
            include: secadoIncludeDefault,
        });

        return secado;
    });
}

export async function actualizarSecado(
    id: number,
    data: Partial<SecadoInput>,
) {
    return prisma.$transaction(
        async (tx) => {
            const secadoExistente =
                await tx.secado.findUnique({
                    where: {
                        id,
                    },
                });

            if (!secadoExistente) {
                throw new Error(
                    "Proceso de secado no encontrado",
                );
            }

            const kilosIngresados =
                data.kilosIngresados !==
                    undefined
                    ? Number(
                        data.kilosIngresados,
                    )
                    : Number(
                        secadoExistente.kilosIngresados,
                    );

            const kilosResultantes =
                data.kilosResultantes !==
                    undefined
                    ? Number(
                        data.kilosResultantes,
                    )
                    : Number(
                        secadoExistente.kilosResultantes,
                    );

            if (
                !Number.isFinite(
                    kilosIngresados,
                ) ||
                kilosIngresados <= 0
            ) {
                throw new Error(
                    "Los kilos ingresados deben ser mayores que cero",
                );
            }

            if (
                !Number.isFinite(
                    kilosResultantes,
                ) ||
                kilosResultantes < 0
            ) {
                throw new Error(
                    "Los kilos resultantes no pueden ser negativos",
                );
            }

            if (
                kilosResultantes >
                kilosIngresados
            ) {
                throw new Error(
                    "Los kilos resultantes no pueden superar los kilos ingresados",
                );
            }

            const merma =
                kilosIngresados -
                kilosResultantes;

            const loteIdAnterior =
                secadoExistente.loteId;

            const loteIdNuevo =
                data.loteId !== undefined
                    ? Number(
                        data.loteId,
                    )
                    : loteIdAnterior;

            const kilosOriginales =
                Number(
                    secadoExistente.kilosIngresados,
                );

            const cambioDeLote =
                loteIdNuevo !==
                loteIdAnterior;

            const secadora =
                data.secadora !==
                    undefined
                    ? data.secadora !==
                        null
                        ? String(
                            data.secadora,
                        ).trim() || null
                        : null
                    : undefined;

            const tempMinima =
                data.tempMinima !==
                    undefined
                    ? data.tempMinima !==
                        null
                        ? Number(
                            data.tempMinima,
                        )
                        : null
                    : undefined;

            const tempMaxima =
                data.tempMaxima !==
                    undefined
                    ? data.tempMaxima !==
                        null
                        ? Number(
                            data.tempMaxima,
                        )
                        : null
                    : undefined;

            if (
                tempMinima !==
                undefined &&
                tempMinima !== null &&
                !Number.isFinite(
                    tempMinima,
                )
            ) {
                throw new Error(
                    "La temperatura mínima debe ser un valor numérico válido",
                );
            }

            if (
                tempMaxima !==
                undefined &&
                tempMaxima !== null &&
                !Number.isFinite(
                    tempMaxima,
                )
            ) {
                throw new Error(
                    "La temperatura máxima debe ser un valor numérico válido",
                );
            }

            const tMin =
                tempMinima !== undefined
                    ? tempMinima
                    : secadoExistente.tempMinima;

            const tMax =
                tempMaxima !== undefined
                    ? tempMaxima
                    : secadoExistente.tempMaxima;

            if (
                tMin !== null &&
                tMin !== undefined &&
                tMax !== null &&
                tMax !== undefined &&
                tMin > tMax
            ) {
                throw new Error(
                    "La temperatura mínima no puede ser mayor que la temperatura máxima",
                );
            }

            /*
             * =====================================================
             * MISMO LOTE
             * =====================================================
             */
            if (!cambioDeLote) {
                const lote =
                    await tx.lote.findUnique({
                        where: {
                            id:
                                loteIdAnterior,
                        },
                    });

                if (!lote) {
                    throw new Error(
                        "Lote no encontrado",
                    );
                }

                const saldoActual =
                    Number(
                        lote.kilosActuales ??
                        lote.kilosIniciales ??
                        0,
                    );

                /*
                 * Los kilos que este mismo secado ya consumió
                 * se consideran disponibles durante la edición.
                 */
                const disponibleEdicion =
                    saldoActual +
                    kilosOriginales;

                if (
                    kilosIngresados >
                    disponibleEdicion
                ) {
                    throw new Error(
                        `Los kilos ingresados (${kilosIngresados} kg) superan los kilos disponibles para esta edición (${disponibleEdicion} kg)`,
                    );
                }

                const nuevoSaldo =
                    disponibleEdicion -
                    kilosIngresados;

                await tx.lote.update({
                    where: {
                        id:
                            loteIdAnterior,
                    },

                    data: {
                        kilosActuales:
                            nuevoSaldo,

                        /*
                         * Mientras exista el proceso,
                         * el lote continúa en secado.
                         */
                        estado:
                            "EN_SECADO",
                    },
                });
            }

            /*
             * =====================================================
             * CAMBIO DE LOTE
             * =====================================================
             */
            else {
                const loteAnterior =
                    await tx.lote.findUnique({
                        where: {
                            id:
                                loteIdAnterior,
                        },
                    });

                const loteNuevo =
                    await tx.lote.findUnique({
                        where: {
                            id:
                                loteIdNuevo,
                        },
                    });

                if (!loteAnterior) {
                    throw new Error(
                        "El lote original no existe",
                    );
                }

                if (!loteNuevo) {
                    throw new Error(
                        "El nuevo lote seleccionado no existe",
                    );
                }

                if (!loteNuevo.activo) {
                    throw new Error(
                        "El nuevo lote seleccionado se encuentra inactivo",
                    );
                }

                const saldoNuevoLote =
                    Number(
                        loteNuevo.kilosActuales ??
                        loteNuevo.kilosIniciales ??
                        0,
                    );

                if (
                    kilosIngresados >
                    saldoNuevoLote
                ) {
                    throw new Error(
                        `Los kilos ingresados (${kilosIngresados} kg) superan los kilos disponibles del nuevo lote (${saldoNuevoLote} kg)`,
                    );
                }

                /*
                 * Restauramos al lote anterior los kilos
                 * consumidos por este secado.
                 */
                const saldoAnterior =
                    Number(
                        loteAnterior.kilosActuales ??
                        loteAnterior.kilosIniciales ??
                        0,
                    );

                const saldoRestaurado =
                    saldoAnterior +
                    kilosOriginales;

                /*
                 * Revisamos si el lote anterior todavía
                 * tiene otros procesos de secado.
                 */
                const otrosSecadosAnterior =
                    await tx.secado.count({
                        where: {
                            loteId:
                                loteIdAnterior,

                            id: {
                                not: id,
                            },
                        },
                    });

                await tx.lote.update({
                    where: {
                        id:
                            loteIdAnterior,
                    },

                    data: {
                        kilosActuales:
                            saldoRestaurado,

                        estado:
                            otrosSecadosAnterior >
                                0
                                ? "EN_SECADO"
                                : "EN_PROCESO",
                    },
                });

                /*
                 * Descontamos del nuevo lote.
                 */
                const nuevoSaldo =
                    saldoNuevoLote -
                    kilosIngresados;

                await tx.lote.update({
                    where: {
                        id:
                            loteIdNuevo,
                    },

                    data: {
                        kilosActuales:
                            nuevoSaldo,

                        estado:
                            "EN_SECADO",
                    },
                });
            }

            const secadoActualizado =
                await tx.secado.update({
                    where: {
                        id,
                    },

                    data: {
                        loteId:
                            loteIdNuevo,

                        fechaInicio:
                            data.fechaInicio !==
                                undefined
                                ? new Date(
                                    data.fechaInicio,
                                )
                                : undefined,

                        fechaFin:
                            data.fechaFin !==
                                undefined
                                ? data.fechaFin
                                    ? new Date(
                                        data.fechaFin,
                                    )
                                    : null
                                : undefined,

                        kilosIngresados,
                        kilosResultantes,
                        merma,

                        observaciones:
                            data.observaciones !==
                                undefined
                                ? data.observaciones
                                : undefined,

                        ...(data.perfilProceso !==
                            undefined && {
                            perfilProceso:
                                data.perfilProceso as any,
                        }),

                        ...(secadora !==
                            undefined && {
                            secadora,
                        }),

                        ...(tempMinima !==
                            undefined && {
                            tempMinima,
                        }),

                        ...(tempMaxima !==
                            undefined && {
                            tempMaxima,
                        }),
                    },

                    include: {
                        lote: true,
                    },
                });

            return secadoActualizado;
        },
    );
}

export async function eliminarSecado(
    id: number,
) {
    return prisma.$transaction(
        async (tx) => {
            const secado =
                await tx.secado.findUnique({
                    where: {
                        id,
                    },
                });

            if (!secado) {
                throw new Error(
                    "Proceso de secado no encontrado",
                );
            }

            const lote =
                await tx.lote.findUnique({
                    where: {
                        id:
                            secado.loteId,
                    },
                });

            if (!lote) {
                throw new Error(
                    "Lote asociado no encontrado",
                );
            }

            const saldoActual =
                Number(
                    lote.kilosActuales ??
                    lote.kilosIniciales ??
                    0,
                );

            const saldoRestaurado =
                saldoActual +
                Number(
                    secado.kilosIngresados,
                );

            /*
             * Eliminamos primero el secado.
             */
            const secadoEliminado =
                await tx.secado.delete({
                    where: {
                        id,
                    },
                });

            /*
             * Revisamos si el lote todavía tiene
             * otros procesos de secado.
             */
            const otrosSecados =
                await tx.secado.count({
                    where: {
                        loteId:
                            secado.loteId,
                    },
                });

            await tx.lote.update({
                where: {
                    id:
                        secado.loteId,
                },

                data: {
                    kilosActuales:
                        saldoRestaurado,

                    estado:
                        otrosSecados > 0
                            ? "EN_SECADO"
                            : "EN_PROCESO",
                },
            });

            return secadoEliminado;
        },
    );
}
