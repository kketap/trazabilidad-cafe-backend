// src/modules/lotes/lotes.service.ts
import { prisma } from "../../config/prisma";
import type { EstadoLote, TipoCodigoLote } from "@prisma/client";

export type LoteCosechaItem = {
    cosechaId: number;
    kilosUsados: number;
};

export type LoteInput = {
    codigo?: string;
    nombre?: string | null;
    tipoCodigo?: TipoCodigoLote;
    estado?: EstadoLote;
    kilosIniciales?: number | null;
    kilosActuales?: number | null;
    saldoTemporal?: number | null;
    hectareas?: number | null;
    ubicacion?: string | null;
    observacion?: string | null;
    gradosBrix?: number | null;
    activo?: boolean;
    cosechas?: LoteCosechaItem[];
};

export async function listarLotes() {
    return prisma.lote.findMany({
        include: {
            cosechaLotes: {
                include: {
                    cosecha: true,
                },
            },
            secadoLotes: {
                include: {
                    secado: true,
                },
            },
        },
        orderBy: {
            id: "desc",
        },
    });
}

export async function obtenerLotePorId(id: number) {
    return prisma.lote.findUnique({
        where: { id },
        include: {
            cosechaLotes: {
                include: {
                    cosecha: true,
                },
            },
            secadoLotes: {
                include: {
                    secado: true,
                },
            },
        },
    });
}

/**
 * Genera el siguiente código principal según el tipo seleccionado.
 *
 * COMERCIAL -> CONV-001, CONV-002...
 * ESPECIAL  -> ESC-001, ESC-002...
 */
export async function generarCodigoPrincipalLote(
    tipoCodigo: TipoCodigoLote,
): Promise<string> {
    const prefijo = tipoCodigo === "ESPECIAL" ? "ESC" : "CONV";

    const lotesExistentes = await prisma.lote.findMany({
        where: {
            codigo: {
                startsWith: `${prefijo}-`,
            },
        },
        select: {
            codigo: true,
        },
    });

    const numerosUsados = lotesExistentes
        .map((lote) => {
            const partes = lote.codigo.split("-");

            // Solo considera códigos principales como ESC-001 o CONV-001.
            if (partes.length !== 2) {
                return 0;
            }

            const numero = Number(partes[1]);
            return Number.isNaN(numero) ? 0 : numero;
        })
        .filter((numero) => numero > 0);

    const siguienteNumero =
        numerosUsados.length > 0 ? Math.max(...numerosUsados) + 1 : 1;

    return `${prefijo}-${String(siguienteNumero).padStart(3, "0")}`;
}

/**
 * Genera el siguiente sublote o saldo desde un código base.
 *
 * Ejemplo:
 * ESC-001   -> ESC-001-1
 * ESC-001   -> ESC-001-2
 * CONV-001  -> CONV-001-1
 */
export async function generarSiguienteCorrelativoLote(
    codigoBase: string,
): Promise<string> {
    const codigoLimpio = codigoBase.trim();

    const lotesExistentes = await prisma.lote.findMany({
        where: {
            codigo: {
                startsWith: `${codigoLimpio}-`,
            },
        },
        select: {
            codigo: true,
        },
    });

    if (lotesExistentes.length === 0) {
        return `${codigoLimpio}-1`;
    }

    const numerosUsados = lotesExistentes
        .map((lote) => {
            const partes = lote.codigo.split("-");
            const ultimoNumero = parseInt(partes[partes.length - 1], 10);

            return Number.isNaN(ultimoNumero) ? 0 : ultimoNumero;
        })
        .filter((numero) => numero > 0);

    const maxNumero =
        numerosUsados.length > 0 ? Math.max(...numerosUsados) : 0;

    return `${codigoLimpio}-${maxNumero + 1}`;
}

/**
 * Crea un lote productivo.
 * Si el tipo es COMERCIAL o ESPECIAL y no viene código, lo genera automáticamente.
 * Si el tipo es PERSONALIZADO, el código debe venir desde el formulario.
 */
export async function crearLote(data: LoteInput) {
    const tipoCodigo = data.tipoCodigo ?? "COMERCIAL";

    if (tipoCodigo === "PERSONALIZADO" && !data.codigo?.trim()) {
        throw new Error("Debe ingresar un código personalizado para el lote");
    }

    const codigo =
        data.codigo?.trim() ||
        (await generarCodigoPrincipalLote(tipoCodigo));

    const cosechasInput = Array.isArray(data.cosechas)
        ? data.cosechas.filter((c) => Number(c.cosechaId) > 0 && Number(c.kilosUsados) > 0)
        : [];

    return prisma.$transaction(async (tx) => {
        let sumaKilosCosechas = 0;

        if (cosechasInput.length > 0) {
            for (const item of cosechasInput) {
                const cosecha = await tx.cosecha.findUnique({
                    where: { id: Number(item.cosechaId) },
                    include: { cosechaLotes: true },
                });

                if (!cosecha) {
                    throw new Error(`La cosecha ID ${item.cosechaId} no existe`);
                }

                const kilosYaUsados = cosecha.cosechaLotes.reduce(
                    (acc, cl) => acc + Number(cl.kilosUsados || 0),
                    0
                );
                const saldoDisponible = Math.max(
                    0,
                    Number((cosecha.kilosCosechados - kilosYaUsados).toFixed(2))
                );

                const kilosAUsar = Number(item.kilosUsados);
                if (kilosAUsar > saldoDisponible) {
                    throw new Error(
                        `La cosecha COS-${String(cosecha.id).padStart(3, "0")} solo tiene ${saldoDisponible} kg disponibles, se intentó usar ${kilosAUsar} kg`
                    );
                }

                sumaKilosCosechas += kilosAUsar;
            }
        }

        const kilosIniciales =
            data.kilosIniciales !== undefined && data.kilosIniciales !== null
                ? Number(data.kilosIniciales)
                : cosechasInput.length > 0
                    ? Number(sumaKilosCosechas.toFixed(2))
                    : null;

        const kilosActuales =
            data.kilosActuales !== undefined && data.kilosActuales !== null
                ? Number(data.kilosActuales)
                : kilosIniciales;

        const loteCreado = await tx.lote.create({
            data: {
                codigo,
                nombre: data.nombre?.trim() || null,
                tipoCodigo,
                estado: data.estado ?? "EN_PROCESO",
                kilosIniciales,
                kilosActuales,
                saldoTemporal:
                    data.saldoTemporal !== undefined && data.saldoTemporal !== null
                        ? Number(data.saldoTemporal)
                        : null,
                hectareas:
                    data.hectareas !== undefined && data.hectareas !== null
                        ? Number(data.hectareas)
                        : null,
                ubicacion: data.ubicacion?.trim() || null,
                observacion: data.observacion?.trim() || null,
                gradosBrix:
                    data.gradosBrix !== undefined && data.gradosBrix !== null
                        ? Number(data.gradosBrix)
                        : null,
                activo: data.activo ?? true,

                cosechaLotes:
                    cosechasInput.length > 0
                        ? {
                            create: cosechasInput.map((c) => ({
                                cosecha: { connect: { id: Number(c.cosechaId) } },
                                kilosUsados: Number(c.kilosUsados),
                            })),
                        }
                        : undefined,
            },
            include: {
                cosechaLotes: {
                    include: {
                        cosecha: true,
                    },
                },
                secadoLotes: {
                    include: {
                        secado: true,
                    },
                },
            },
        });

        return loteCreado;
    });
}

/**
 * Actualiza un lote productivo.
 */
export async function actualizarLote(id: number, data: Partial<LoteInput>) {
    return prisma.lote.update({
        where: { id },
        data: {
            ...(data.codigo !== undefined && {
                codigo: data.codigo.trim(),
            }),
            ...(data.nombre !== undefined && {
                nombre: data.nombre?.trim() || null,
            }),
            ...(data.tipoCodigo !== undefined && {
                tipoCodigo: data.tipoCodigo,
            }),
            ...(data.estado !== undefined && {
                estado: data.estado,
            }),
            ...(data.kilosIniciales !== undefined && {
                kilosIniciales:
                    data.kilosIniciales !== null
                        ? Number(data.kilosIniciales)
                        : null,
            }),
            ...(data.kilosActuales !== undefined && {
                kilosActuales:
                    data.kilosActuales !== null
                        ? Number(data.kilosActuales)
                        : null,
            }),
            ...(data.saldoTemporal !== undefined && {
                saldoTemporal:
                    data.saldoTemporal !== null
                        ? Number(data.saldoTemporal)
                        : null,
            }),
            ...(data.hectareas !== undefined && {
                hectareas:
                    data.hectareas !== null ? Number(data.hectareas) : null,
            }),
            ...(data.ubicacion !== undefined && {
                ubicacion: data.ubicacion?.trim() || null,
            }),
            ...(data.observacion !== undefined && {
                observacion: data.observacion?.trim() || null,
            }),
            ...(data.gradosBrix !== undefined && {
                gradosBrix:
                    data.gradosBrix !== null ? Number(data.gradosBrix) : null,
            }),
            ...(data.activo !== undefined && {
                activo: data.activo,
            }),
        },
    });
}

/**
 * Desactiva un lote si tiene cosechas asociadas.
 * Si no tiene relaciones, se elimina físicamente.
 */
export async function eliminarLote(id: number) {
    const cosechasAsociadas = await prisma.cosechaLote.count({
        where: {
            loteId: id,
        },
    });

    if (cosechasAsociadas > 0) {
        return prisma.lote.update({
            where: { id },
            data: {
                activo: false,
                estado: "INACTIVO",
            },
        });
    }

    return prisma.lote.delete({
        where: { id },
    });
}