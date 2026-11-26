// src/modules/lotes/lotes.service.ts
import { prisma } from "../../config/prisma";
import { Prisma, type EstadoLote, type TipoCodigoLote } from "@prisma/client";

export class ErrorValidacionLote extends Error {}
export class ErrorConflictoLote extends Error {}

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
    versionLote?: string;
};

const loteInclude = {
    cosechaLotes: { include: { cosecha: true } },
    secadoLotes: { include: { secado: true } },
    secados: {
        where: { secadoLotes: { none: {} } },
        select: { kilosIngresados: true },
    },
} satisfies Prisma.LoteInclude;

function conKilosProcesados({ secados, ...lote }: Prisma.LoteGetPayload<{ include: typeof loteInclude }>) {
    const kilosPorLote = lote.secadoLotes.reduce((total, aporte) => total + aporte.kilosUsados, 0);
    // Los secados antiguos de un solo lote guardaban el peso en el propio registro.
    const kilosHistoricos = secados.reduce((total, secado) => total + secado.kilosIngresados, 0);
    return { ...lote, kilosProcesados: Number((kilosPorLote + kilosHistoricos).toFixed(2)) };
}

export async function listarLotes() {
    const lotes = await prisma.lote.findMany({
        include: loteInclude,
        orderBy: { id: "desc" },
    });

    return lotes.map(conKilosProcesados);
}

export async function obtenerLotePorId(id: number) {
    const lote = await prisma.lote.findUnique({
        where: { id },
        include: loteInclude,
    });

    return lote ? conKilosProcesados(lote) : null;
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

function normalizarAportes(cosechas: LoteCosechaItem[]): LoteCosechaItem[] {
    if (!Array.isArray(cosechas)) {
        throw new ErrorValidacionLote("La lista de cosechas no es válida.");
    }

    const aportes = cosechas.map((item) => ({
        cosechaId: Number(item?.cosechaId),
        kilosUsados: Number(item?.kilosUsados),
    }));
    if (aportes.some(({ cosechaId, kilosUsados }) =>
        !Number.isSafeInteger(cosechaId) || cosechaId <= 0 ||
        !Number.isFinite(kilosUsados) || kilosUsados <= 0 ||
        Number(kilosUsados.toFixed(2)) !== kilosUsados
    )) {
        throw new ErrorValidacionLote("Ingresa un peso mayor a cero, con hasta dos decimales, para cada cosecha seleccionada.");
    }
    if (new Set(aportes.map(({ cosechaId }) => cosechaId)).size !== aportes.length) {
        throw new ErrorValidacionLote("Cada cosecha solo puede asociarse una vez al lote.");
    }
    return aportes;
}

async function validarSaldoCosechas(
    tx: Prisma.TransactionClient,
    aportes: LoteCosechaItem[],
    loteId?: number,
) {
    for (const { cosechaId, kilosUsados } of aportes) {
        const cosecha = await tx.cosecha.findUnique({
            where: { id: cosechaId },
            include: {
                cosechaLotes: { where: loteId === undefined ? undefined : { loteId: { not: loteId } } },
            },
        });
        const codigo = `COS-${String(cosechaId).padStart(3, "0")}`;
        if (!cosecha) {
            throw new ErrorValidacionLote(`La cosecha ${codigo} ya no está disponible.`);
        }

        const kilosYaUsados = cosecha.cosechaLotes.reduce((total, vinculo) => total + vinculo.kilosUsados, 0);
        const saldo = Math.max(0, Number((cosecha.kilosCosechados - kilosYaUsados).toFixed(2)));
        if (kilosUsados > saldo) {
            throw new ErrorValidacionLote(`La cosecha ${codigo} tiene ${saldo} kg disponibles para este lote. Reduce los kilos a tomar.`);
        }
    }
}

/**
 * Crea un lote productivo.
 * Si el tipo es COMERCIAL o ESPECIAL y no viene código, lo genera automáticamente.
 * Si el tipo es PERSONALIZADO, el código debe venir desde el formulario.
 */
export async function crearLote(data: LoteInput) {
    const tipoCodigo = data.tipoCodigo ?? "COMERCIAL";

    if (tipoCodigo === "PERSONALIZADO" && !data.codigo?.trim()) {
        throw new ErrorValidacionLote("Debe ingresar un código personalizado para el lote");
    }

    const codigo =
        data.codigo?.trim() ||
        (await generarCodigoPrincipalLote(tipoCodigo));

    const cosechasInput = data.cosechas === undefined ? [] : normalizarAportes(data.cosechas);

    return prisma.$transaction(async (tx) => {
        await validarSaldoCosechas(tx, cosechasInput);
        const totalCosechas = cosechasInput.length > 0
            ? Number(cosechasInput.reduce((total, item) => total + item.kilosUsados, 0).toFixed(2))
            : null;

        const kilosIniciales = totalCosechas ?? (data.kilosIniciales == null ? null : Number(data.kilosIniciales));
        const kilosActuales = totalCosechas ?? (data.kilosActuales == null ? kilosIniciales : Number(data.kilosActuales));

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
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/**
 * Actualiza un lote productivo.
 */
export async function actualizarLote(id: number, data: Partial<LoteInput>) {
    const cambios: Prisma.LoteUpdateInput = {
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
    };

    if (data.cosechas === undefined) {
        return prisma.lote.update({ where: { id }, data: cambios });
    }

    const aportes = normalizarAportes(data.cosechas);
    return prisma.$transaction(async (tx) => {
        const lote = await tx.lote.findUniqueOrThrow({ where: { id } });
        if (data.versionLote !== undefined && data.versionLote !== lote.updatedAt.toISOString()) {
            throw new ErrorConflictoLote("El lote cambió desde que abriste el formulario. Actualiza la lista y vuelve a editarlo.");
        }

        await validarSaldoCosechas(tx, aportes, id);

        const totalAportes = Number(aportes.reduce((total, item) => total + item.kilosUsados, 0).toFixed(2));
        const inicialAnterior = lote.kilosIniciales ?? lote.kilosActuales ?? 0;
        const saldoAnterior = lote.kilosActuales ?? inicialAnterior;
        const diferencia = Math.max(0, Number((inicialAnterior - saldoAnterior).toFixed(2)));

        if (totalAportes < diferencia) {
            throw new ErrorValidacionLote(`Las cosechas deben aportar al menos ${diferencia} kg para conservar los kilos ya descontados del lote.`);
        }

        const kilosIniciales = Number(data.kilosIniciales ?? totalAportes);
        if (!Number.isFinite(kilosIniciales) || kilosIniciales < diferencia || kilosIniciales > totalAportes) {
            throw new ErrorValidacionLote(`Al cambiar las cosechas, ingresa un peso inicial entre ${diferencia} y ${totalAportes} kg.`);
        }

        const maximoActual = Number((kilosIniciales - diferencia).toFixed(2));
        const kilosActuales = Number(data.kilosActuales ?? maximoActual);
        if (!Number.isFinite(kilosActuales) || kilosActuales < 0 || kilosActuales > maximoActual) {
            throw new ErrorValidacionLote(`Al cambiar las cosechas, ingresa entre 0 y ${maximoActual} kg actuales para conservar los kilos ya descontados.`);
        }

        return tx.lote.update({
            where: { id },
            data: {
                ...cambios,
                kilosIniciales,
                kilosActuales,
                cosechaLotes: {
                    deleteMany: aportes.length ? { cosechaId: { notIn: aportes.map((item) => item.cosechaId) } } : {},
                    upsert: aportes.map(({ cosechaId, kilosUsados }) => ({
                        where: { cosechaId_loteId: { cosechaId, loteId: id } },
                        create: { cosechaId, kilosUsados },
                        update: { kilosUsados },
                    })),
                },
            },
            include: { cosechaLotes: { include: { cosecha: true } } },
        });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/**
 * Conserva los lotes vinculados al historial productivo.
 */
export async function eliminarLote(id: number) {
    return prisma.$transaction(async (tx) => {
        const { count } = await tx.lote.deleteMany({
            where: {
                id,
                ordenTrillaId: null,
                cosechaLotes: { none: {} },
                ProcesoTrazabilidad: { none: {} },
                procesoLotes: { none: {} },
                secados: { none: {} },
                secadoLotes: { none: {} },
                empaques: { none: {} },
                ordenTrillaLotes: { none: {} },
            },
        });

        if (count > 0) return "eliminado";

        await tx.lote.update({
            where: { id },
            data: { activo: false, estado: "INACTIVO" },
        });
        return "desactivado";
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}