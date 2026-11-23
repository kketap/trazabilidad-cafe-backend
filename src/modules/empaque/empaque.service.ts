// src/modules/empaque/empaque.service.ts
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export type EmpaqueInput = {
    codigo?: string | null;
    loteId: number;
    secadoId?: number | null;
    secadoIds?: number[];
    fechaInicio: string | Date;
    fechaFin?: string | Date | null;
    kilosIngresados: number;
    kilosResultantes: number;
    tipoEmpaque?: string | null;
    cantidadEmpaques?: number | null;
    rendimiento?: number | null;
    observaciones?: string | null;
    humedad?: number | null;
    actividadAgua?: number | null;
    puntajeSca?: number | null;
    perfilSensorial?: string | null;
    fueCatado?: boolean | null;
};

const empaqueIncludeDefault = {
    lote: true,
    secado: { include: { secadoLotes: { include: { lote: true } } } },
    ordenesTrilla: { select: { kilosEnviados: true } },
    empaqueSecados: {
        include: {
            secado: { include: { secadoLotes: { include: { lote: true } } } },
        },
    },
};

/**
 * Genera el siguiente código de empaque: EMP-001, EMP-002...
 */
async function generarCodigoEmpaque(): Promise<string> {
    const empaquesExistentes = await prisma.empaque.findMany({
        where: {
            codigo: { startsWith: "EMP-" },
        },
        select: { codigo: true },
    });

    const numerosUsados = empaquesExistentes
        .map((e) => {
            if (!e.codigo) return 0;
            const partes = e.codigo.split("-");
            const num = Number(partes[partes.length - 1]);
            return Number.isNaN(num) ? 0 : num;
        })
        .filter((n) => n > 0);

    const siguiente = numerosUsados.length > 0 ? Math.max(...numerosUsados) + 1 : 1;
    return `EMP-${String(siguiente).padStart(3, "0")}`;
}

export async function listarEmpaques() {
    return prisma.empaque.findMany({
        include: empaqueIncludeDefault,
        orderBy: {
            id: "desc",
        },
    });
}

export async function obtenerEmpaquePorId(id: number) {
    return prisma.empaque.findUnique({
        where: { id },
        include: empaqueIncludeDefault,
    });
}

async function obtenerPesoSeco(
    tx: Prisma.TransactionClient,
    secadoIds: number[],
    empaqueId?: number,
) {
    const secados = await tx.secado.findMany({
        where: { id: { in: secadoIds } },
        select: { kilosResultantes: true },
    });
    if (secados.length !== secadoIds.length || secados.some(({ kilosResultantes }) => kilosResultantes === null)) {
        throw new Error("Seleccione secados existentes, sin duplicados y con el peso seco registrado");
    }
    const otroIngreso = await tx.empaque.findFirst({
        where: {
            ...(empaqueId !== undefined && { id: { not: empaqueId } }),
            OR: [
                { secadoId: { in: secadoIds } },
                { empaqueSecados: { some: { secadoId: { in: secadoIds } } } },
            ],
        },
        select: { id: true },
    });
    if (otroIngreso) throw new Error("Uno o más secados ya están registrados en Almacén Pergamino");
    return Number(secados.reduce((total, secado) => total + (secado.kilosResultantes ?? 0), 0).toFixed(2));
}

export async function crearEmpaque(data: EmpaqueInput) {
    const secadoIds =
        Array.isArray(data.secadoIds) && data.secadoIds.length > 0
            ? data.secadoIds.map(Number)
            : data.secadoId
                ? [Number(data.secadoId)]
                : [];

    const primarySecadoId = secadoIds.length > 0 ? secadoIds[0] : null;

    return prisma.$transaction(async (tx) => {
        const lote = await tx.lote.findUnique({
            where: { id: Number(data.loteId) },
        });

        if (!lote) {
            throw new Error("Lote no encontrado");
        }

        const pesoSeco = secadoIds.length ? await obtenerPesoSeco(tx, secadoIds) : null;
        const kilosIngresados = pesoSeco ?? Number(data.kilosIngresados);
        const kilosResultantes = pesoSeco ?? Number(data.kilosResultantes);
        const merma = kilosIngresados - kilosResultantes;
        const codigo = data.codigo?.trim() || (await generarCodigoEmpaque());

        const empaque = await tx.empaque.create({
            data: {
                codigo,
                loteId: Number(data.loteId),
                secadoId: primarySecadoId,
                fechaInicio: new Date(data.fechaInicio),
                fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
                kilosIngresados,
                kilosResultantes,
                merma,
                tipoEmpaque: data.tipoEmpaque?.trim() ?? null,
                cantidadEmpaques: data.cantidadEmpaques != null ? Number(data.cantidadEmpaques) : null,
                rendimiento: data.rendimiento != null ? Number(data.rendimiento) : null,
                observaciones: data.observaciones || null,
                humedad: data.humedad != null ? Number(data.humedad) : null,
                actividadAgua: data.actividadAgua != null ? Number(data.actividadAgua) : null,
                puntajeSca: data.puntajeSca != null ? Number(data.puntajeSca) : null,
                perfilSensorial: data.perfilSensorial?.trim() || null,
                fueCatado: data.fueCatado ?? null,
                empaqueSecados:
                    secadoIds.length > 0
                        ? {
                            create: secadoIds.map((secadoId) => ({
                                secadoId,
                            })),
                        }
                        : undefined,
            },
            include: empaqueIncludeDefault,
        });

        if (!secadoIds.length) await tx.lote.update({
            where: { id: Number(data.loteId) },
            data: {
                estado: "EN_ALMACEN",
                kilosActuales: kilosResultantes,
            },
        });

        return empaque;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function actualizarEmpaque(id: number, data: Partial<EmpaqueInput>) {
    return prisma.$transaction(async (tx) => {
        const empaqueExistente = await tx.empaque.findUnique({
            where: { id },
            include: { empaqueSecados: true },
        });

        if (!empaqueExistente) {
            throw new Error("Proceso de empaque no encontrado");
        }

        const anteriores = empaqueExistente.empaqueSecados.length
            ? empaqueExistente.empaqueSecados.map(({ secadoId }) => secadoId)
            : empaqueExistente.secadoId ? [empaqueExistente.secadoId] : [];
        const secadoIds = data.secadoIds?.map(Number) ??
            (data.secadoId !== undefined ? (data.secadoId ? [Number(data.secadoId)] : []) : anteriores);
        const cambiaSecados = secadoIds.length !== anteriores.length ||
            secadoIds.some((secadoId) => !anteriores.includes(secadoId));
        const ordenes = await tx.ordenTrilla.count({ where: { empaqueId: id } });
        if (ordenes && (cambiaSecados || (data.loteId !== undefined && data.loteId !== empaqueExistente.loteId) ||
            (!secadoIds.length && data.kilosResultantes !== undefined &&
                Number(data.kilosResultantes) !== empaqueExistente.kilosResultantes))) {
            throw new Error("El registro tiene órdenes de trilla y su origen y peso ya están asociados");
        }

        const cambiaPeso = secadoIds.length && cambiaSecados;
        const pesoSeco = cambiaPeso ? await obtenerPesoSeco(tx, secadoIds, id) : null;
        const kilosIngresados = pesoSeco ?? (secadoIds.length ? empaqueExistente.kilosIngresados :
            Number(data.kilosIngresados ?? empaqueExistente.kilosIngresados));
        const kilosResultantes = pesoSeco ?? (secadoIds.length ? empaqueExistente.kilosResultantes :
            Number(data.kilosResultantes ?? empaqueExistente.kilosResultantes));
        const merma = kilosIngresados - kilosResultantes;
        const loteId = data.loteId ?? empaqueExistente.loteId;

        if (cambiaSecados) {
            await tx.empaqueSecado.deleteMany({
                where: { empaqueId: id },
            });
            if (secadoIds.length > 0) {
                await tx.empaqueSecado.createMany({
                    data: secadoIds.map((secadoId) => ({
                        empaqueId: id,
                        secadoId,
                    })),
                    skipDuplicates: true,
                });
            }
        }

        const empaqueActualizado = await tx.empaque.update({
            where: { id },
            data: {
                ...(data.codigo !== undefined && { codigo: data.codigo?.trim() || null }),
                ...(loteId ? { lote: { connect: { id: loteId } } } : {}),
                ...(cambiaSecados && { secado: secadoIds.length
                    ? { connect: { id: secadoIds[0] } } : { disconnect: true } }),
                fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : undefined,
                fechaFin: data.fechaFin !== undefined ? (data.fechaFin ? new Date(data.fechaFin) : null) : undefined,
                kilosIngresados,
                kilosResultantes,
                merma,
                ...(data.tipoEmpaque !== undefined && { tipoEmpaque: data.tipoEmpaque?.trim() ?? null }),
                ...(data.cantidadEmpaques !== undefined && { cantidadEmpaques: data.cantidadEmpaques != null ? Number(data.cantidadEmpaques) : null }),
                ...(data.rendimiento !== undefined && { rendimiento: data.rendimiento != null ? Number(data.rendimiento) : null }),
                observaciones: data.observaciones !== undefined ? data.observaciones : undefined,
                ...(data.humedad !== undefined && { humedad: data.humedad != null ? Number(data.humedad) : null }),
                ...(data.actividadAgua !== undefined && { actividadAgua: data.actividadAgua != null ? Number(data.actividadAgua) : null }),
                ...(data.puntajeSca !== undefined && { puntajeSca: data.puntajeSca != null ? Number(data.puntajeSca) : null }),
                ...(data.perfilSensorial !== undefined && { perfilSensorial: data.perfilSensorial?.trim() || null }),
                ...(data.fueCatado !== undefined && { fueCatado: data.fueCatado }),
            },
            include: empaqueIncludeDefault,
        });

        if (!secadoIds.length && (kilosResultantes !== empaqueExistente.kilosResultantes || loteId !== empaqueExistente.loteId)) {
            await tx.lote.update({
                where: { id: loteId },
                data: {
                    estado: "EN_ALMACEN",
                    kilosActuales: kilosResultantes,
                },
            });
        }

        return empaqueActualizado;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function eliminarEmpaque(id: number) {
    return prisma.empaque.delete({
        where: { id },
    });
}
