// src/modules/secado/secado.service.ts
import { prisma } from "../../config/prisma";

import { Prisma } from "@prisma/client";

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
    kilosResultantes?: number | null;
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

async function generarCodigoSecado(
    tx: Prisma.TransactionClient,
    perfil?: string | null,
): Promise<string> {
    const prefijo = perfil
        ? `SEC-${perfil.toUpperCase().slice(0, 3)}`
        : "SEC";

    const secadosExistentes = await tx.secado.findMany({
        where: {
            codigo: {
                startsWith: `${prefijo}-`,
            },
        },
        select: {
            codigo: true,
        },
    });

    const numerosUsados = secadosExistentes
        .map((secado) => {
            if (!secado.codigo) {
                return 0;
            }

            const partes = secado.codigo.split("-");

            if (partes.slice(0, -1).join("-") !== prefijo) return 0;
            const numero = Number(partes[partes.length - 1]);

            return Number.isNaN(numero)
                ? 0
                : numero;
        })
        .filter((numero) => numero > 0);

    const siguiente =
        numerosUsados.length > 0
            ? Math.max(...numerosUsados) + 1
            : 1;

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

function validarAportes(lotes: SecadoLoteItem[], kilosIngresados: number) {
    if (!Array.isArray(lotes) || !lotes.length || lotes.some((lote) =>
        !lote || !Number.isSafeInteger(lote.loteId) || lote.loteId <= 0 ||
        !Number.isFinite(lote.kilosUsados) || lote.kilosUsados <= 0
    )) {
        throw new Error("Seleccione lotes válidos e ingrese los kilos de cada aporte");
    }
    if (new Set(lotes.map((lote) => lote.loteId)).size !== lotes.length) {
        throw new Error("Un lote no puede aparecer más de una vez");
    }
    const total = lotes.reduce((suma, lote) => suma + lote.kilosUsados, 0);
    if (Math.abs(total - kilosIngresados) > 0.000001) {
        throw new Error("La suma de los aportes debe coincidir con los kilos ingresados");
    }
}

async function ajustarAportes(
    tx: Prisma.TransactionClient,
    anteriores: SecadoLoteItem[],
    nuevos: SecadoLoteItem[],
    secadoId?: number,
) {
    const previos = new Map(anteriores.map((lote) => [lote.loteId, lote.kilosUsados]));
    const actuales = new Map(nuevos.map((lote) => [lote.loteId, lote.kilosUsados]));
    const ids = [...new Set([...previos.keys(), ...actuales.keys()])].sort((a, b) => a - b);
    for (const id of ids) {
        const anterior = previos.get(id) ?? 0;
        const nuevo = actuales.get(id) ?? 0;
        if (anterior === nuevo) continue;

        const lote = await tx.lote.findUnique({ where: { id } });
        if (!lote) throw new Error(`El lote ID ${id} no fue encontrado`);
        if (!lote.activo && nuevo > anterior) {
            throw new Error(`El lote ${lote.codigo} se encuentra inactivo`);
        }
        const disponible = (lote.kilosActuales ?? lote.kilosIniciales ?? 0) + anterior;
        const saldo = Number((disponible - nuevo).toFixed(2));
        if (disponible + 0.000001 < nuevo) {
            throw new Error(`El lote ${lote.codigo} tiene ${disponible} kg disponibles y se solicitaron ${nuevo} kg`);
        }

        const otrosSecados = nuevo === 0 && await tx.secado.count({
            where: {
                ...(secadoId !== undefined && { id: { not: secadoId } }),
                OR: [{ loteId: id }, { secadoLotes: { some: { loteId: id } } }],
            },
        });
        await tx.lote.update({
            where: { id },
            data: {
                kilosActuales: Math.max(0, saldo),
                estado: nuevo > 0 ? (secadoId !== undefined || saldo === 0 ? "EN_SECADO" : "EN_PROCESO")
                    : otrosSecados ? "EN_SECADO" : "EN_PROCESO",
            },
        });
    }
}

export async function crearSecado(data: SecadoInput) {
    const kilosIngresados = Number(data.kilosIngresados);
    const kilosResultantes = data.kilosResultantes == null ? null : Number(data.kilosResultantes);

    if (!Number.isFinite(kilosIngresados) || kilosIngresados <= 0) {
        throw new Error("Los kilos ingresados deben ser mayores que cero");
    }

    if (kilosResultantes !== null && (!Number.isFinite(kilosResultantes) || kilosResultantes < 0)) {
        throw new Error("Los kilos resultantes no pueden ser negativos");
    }

    if (kilosResultantes !== null && kilosResultantes > kilosIngresados) {
        throw new Error("Los kilos resultantes no pueden superar los kilos ingresados");
    }

    const merma = kilosResultantes === null ? null : kilosIngresados - kilosResultantes;

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

    const lotesInput = data.lotes ?? (data.loteId ? [{ loteId: data.loteId, kilosUsados: kilosIngresados }] : []);
    validarAportes(lotesInput, kilosIngresados);

    return prisma.$transaction(
        async (tx) => {
            await ajustarAportes(tx, [], lotesInput);

            const codigo =
                data.codigo?.trim() ||
                (await generarCodigoSecado(
                    tx,
                    data.perfilProceso,
                ));

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
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function actualizarSecado(
    id: number,
    data: Partial<SecadoInput>,
) {
    return prisma.$transaction(
        async (tx) => {
            const secadoExistente =
                await tx.secado.findUnique({
                    where: { id }, include: { secadoLotes: true },
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
                data.kilosResultantes === undefined
                    ? secadoExistente.kilosResultantes
                    : data.kilosResultantes;

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
                kilosResultantes !== null &&
                (!Number.isFinite(kilosResultantes) || kilosResultantes < 0)
            ) {
                throw new Error(
                    "Los kilos resultantes no pueden ser negativos",
                );
            }

            if (
                kilosResultantes !== null && kilosResultantes > kilosIngresados
            ) {
                throw new Error(
                    "Los kilos resultantes no pueden superar los kilos ingresados",
                );
            }

            if (kilosResultantes !== secadoExistente.kilosResultantes ||
                (data.perfilProceso !== undefined && data.perfilProceso !== secadoExistente.perfilProceso) ||
                (secadoExistente.fechaFin && data.fechaFin === null)) {
                const vinculos = await tx.empaque.count({
                    where: { OR: [{ secadoId: id }, { empaqueSecados: { some: { secadoId: id } } }] },
                });
                if (vinculos) throw new Error("El secado ya está vinculado a un ingreso de Almacén Pergamino");
            }
            const merma = kilosResultantes === null ? null : kilosIngresados - kilosResultantes;

            const anteriores = secadoExistente.secadoLotes.length
                ? secadoExistente.secadoLotes
                : [{ loteId: secadoExistente.loteId, kilosUsados: secadoExistente.kilosIngresados }];
            if (!data.lotes && anteriores.length > 1 &&
                (kilosIngresados !== secadoExistente.kilosIngresados ||
                    (data.loteId !== undefined && data.loteId !== secadoExistente.loteId))) {
                throw new Error("Indique todos los aportes al modificar un secado con varios lotes");
            }
            const nuevos = data.lotes ?? (anteriores.length === 1
                ? [{ loteId: data.loteId ?? secadoExistente.loteId, kilosUsados: kilosIngresados }]
                : anteriores);
            validarAportes(nuevos, kilosIngresados);
            const loteIdNuevo = nuevos[0].loteId;

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

            const cambioAportes = anteriores.length !== nuevos.length || nuevos.some((aporte) =>
                !anteriores.some((anterior) => anterior.loteId === aporte.loteId && anterior.kilosUsados === aporte.kilosUsados),
            );
            if (cambioAportes) {
                const vinculos = await tx.empaque.count({
                    where: { OR: [{ secadoId: id }, { empaqueSecados: { some: { secadoId: id } } }] },
                });
                if (vinculos) throw new Error("El origen del secado ya está vinculado a Almacén Pergamino");
            }
            await ajustarAportes(tx, anteriores, nuevos, id);

            const secadoActualizado =
                await tx.secado.update({
                    where: {
                        id,
                    },

                    data: {
                        loteId: loteIdNuevo,
                        secadoLotes: {
                            deleteMany: {},
                            create: nuevos.map(({ loteId, kilosUsados }) => ({ loteId, kilosUsados })),
                        },

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

                    include: secadoIncludeDefault,
                });

            return secadoActualizado;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
}

export async function eliminarSecado(id: number) {
    return prisma.$transaction(async (tx) => {
        const secado = await tx.secado.findUnique({
            where: { id },
            include: { secadoLotes: true },
        });
        if (!secado) throw new Error("Proceso de secado no encontrado");

        const aportes = secado.secadoLotes.length ? secado.secadoLotes
            : [{ loteId: secado.loteId, kilosUsados: secado.kilosIngresados }];
        const eliminado = await tx.secado.delete({ where: { id } });
        await ajustarAportes(tx, aportes, [], id);
        return eliminado;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
