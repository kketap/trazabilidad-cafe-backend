// src/modules/empaque/empaque.service.ts
import { Prisma } from "@prisma/client";
import { saldoNetoTrilla } from "./saldo-empaque";
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
    muestra?: boolean | null;
    perfilSecado?: string | null;
};

const empaqueIncludeDefault = {
    lote: true,
    secado: { include: { secadoLotes: { include: { lote: true } } } },
    ordenesTrilla: { select: { kilosEnviados: true } },
    enviosTrilla: { select: { kilosNetos: true } },
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

function conSaldoAlmacen<T extends Prisma.EmpaqueGetPayload<{ include: typeof empaqueIncludeDefault }>>(registro: T) {
    const saldoTrilla = saldoNetoTrilla(registro);
    const estado = saldoTrilla > 0 ? "EN_ALMACEN"
        : registro.ordenesTrilla.length || registro.enviosTrilla.length ? "EN_TRILLA" : "EN_PROCESO";
    return { ...registro, saldoTrilla, estado };
}

export async function listarEmpaques() {
    const registros = await prisma.empaque.findMany({
        include: empaqueIncludeDefault,
        orderBy: {
            id: "desc",
        },
    });
    return registros.map(conSaldoAlmacen);
}

export async function obtenerEmpaquePorId(id: number) {
    const registro = await prisma.empaque.findUnique({
        where: { id },
        include: empaqueIncludeDefault,
    });
    return registro ? conSaldoAlmacen(registro) : null;
}

async function validarSecados(
    tx: Prisma.TransactionClient,
    secadoIds: number[],
    loteId: number,
    perfilSecado?: string | null,
    empaqueId?: number,
) {
    const secados = await tx.secado.findMany({
        where: { id: { in: secadoIds } },
        select: { fechaFin: true, perfilProceso: true, loteId: true, secadoLotes: { select: { loteId: true } } },
    });
    if (secados.length !== secadoIds.length || secados.some(({ fechaFin }) => !fechaFin)) {
        throw new Error("Seleccione secados terminados y sin duplicados");
    }
    const perfil = perfilSecado ?? secados[0]?.perfilProceso;
    if (!perfil || secados.some((secado) => secado.perfilProceso !== perfil)) {
        throw new Error("Seleccione secados del mismo perfil del lote");
    }
    const loteEsOrigen = (secado: typeof secados[number]) =>
        secado.loteId === loteId || secado.secadoLotes.some((aporte) => aporte.loteId === loteId);
    if (!secados.some(loteEsOrigen)) {
        throw new Error("Al menos un secado debe corresponder al lote seleccionado");
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
}

function validarPesos(kilosBrutos: number, kilosNetos: number) {
    if (!Number.isFinite(kilosBrutos) || !Number.isFinite(kilosNetos) ||
        kilosBrutos <= 0 || kilosNetos <= 0 || kilosNetos > kilosBrutos) {
        throw new Error("Ingrese kilos brutos y netos mayores a cero. Los netos no pueden superar a los brutos.");
    }
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

        if (!lote.activo || !secadoIds.length) throw new Error("Seleccione un lote activo y al menos un secado terminado");
        await validarSecados(tx, secadoIds, lote.id, data.perfilSecado);
        const kilosIngresados = Number(data.kilosIngresados);
        const kilosResultantes = Number(data.kilosResultantes);
        validarPesos(kilosIngresados, kilosResultantes);
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
                muestra: data.muestra ?? null,
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

        return conSaldoAlmacen(empaque);
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
        const loteId = data.loteId ?? empaqueExistente.loteId;
        const kilosIngresados = Number(data.kilosIngresados ?? empaqueExistente.kilosIngresados);
        const kilosResultantes = Number(data.kilosResultantes ?? empaqueExistente.kilosResultantes);
        if (data.kilosIngresados !== undefined || data.kilosResultantes !== undefined) {
            validarPesos(kilosIngresados, kilosResultantes);
        }
        const ordenes = await tx.ordenTrilla.count({
            where: { OR: [{ empaqueId: id }, { almacenes: { some: { empaqueId: id } } }] },
        });
        if (ordenes && (cambiaSecados || loteId !== empaqueExistente.loteId ||
            kilosResultantes !== empaqueExistente.kilosResultantes)) {
            throw new Error("Este registro ya tiene envíos a Trilla. Sus orígenes y kilos netos están comprometidos.");
        }
        if (cambiaSecados || loteId !== empaqueExistente.loteId) {
            if (!secadoIds.length) throw new Error("Seleccione al menos un secado terminado");
            await validarSecados(tx, secadoIds, loteId, data.perfilSecado, id);
        }
        const merma = kilosIngresados - kilosResultantes;

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
                ...(data.muestra !== undefined && { muestra: data.muestra }),
            },
            include: empaqueIncludeDefault,
        });

        return conSaldoAlmacen(empaqueActualizado);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function eliminarEmpaque(id: number) {
    return prisma.empaque.delete({
        where: { id },
    });
}
