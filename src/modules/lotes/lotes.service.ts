// src/modules/lotes/lotes.service.ts
import { prisma } from "../../config/prisma";

export type LoteInput = {
    codigo: string;
    nombre?: string;
    hectareas?: number;
    ubicacion?: string;
    observacion?: string;
    activo?: boolean;
    tipo_cafe?: string; // "comercial" | "especial"
    horas_oxidacion?: number;
    horas_fermentacion?: number;
};

export async function listarLotes() {
    return prisma.lote.findMany({
        orderBy: {
            id: "desc",
        },
    });
}

export async function obtenerLotePorId(id: number) {
    return prisma.lote.findUnique({
        where: { id },
    });
}

/**
 * Genera el siguiente código correlativo de saldo/sublote para un código base.
 * Ejemplo: si existe "ESC-001", la primera subdivisión será "ESC-001-1", luego "ESC-001-2".
 */
export async function generarSiguienteCorrelativoLote(codigoBase: string): Promise<string> {
    const lotesExistentes = await prisma.lote.findMany({
        where: {
            codigo: {
                startsWith: `${codigoBase}-`,
            },
        },
        select: { codigo: true },
    });

    if (lotesExistentes.length === 0) {
        return `${codigoBase}-1`;
    }

    const numerosUsados = lotesExistentes
        .map((l) => {
            const partes = l.codigo.split("-");
            const ultimoNum = parseInt(partes[partes.length - 1], 10);
            return isNaN(ultimoNum) ? 0 : ultimoNum;
        })
        .filter((n) => n > 0);

    const maxNumero = numerosUsados.length > 0 ? Math.max(...numerosUsados) : 0;
    return `${codigoBase}-${maxNumero + 1}`;
}

export async function crearLote(data: LoteInput) {
    const tipoCafe = data.tipo_cafe || "comercial";

    return prisma.lote.create({
        data: {
            codigo: data.codigo.trim(),
            nombre: data.nombre?.trim() || null,
            hectareas:
                data.hectareas !== undefined && data.hectareas !== null
                    ? Number(data.hectareas)
                    : null,
            ubicacion: data.ubicacion?.trim() || null,
            observacion: data.observacion?.trim() || null,
            activo: data.activo ?? true,
            tipo_cafe: tipoCafe,
            horas_oxidacion:
                tipoCafe === "especial" && data.horas_oxidacion !== undefined && data.horas_oxidacion !== null
                    ? Number(data.horas_oxidacion)
                    : null,
            horas_fermentacion:
                tipoCafe === "especial" && data.horas_fermentacion !== undefined && data.horas_fermentacion !== null
                    ? Number(data.horas_fermentacion)
                    : null,
        },
    });
}

export async function actualizarLote(id: number, data: Partial<LoteInput>) {
    const tipoCafe = data.tipo_cafe;

    return prisma.lote.update({
        where: { id },
        data: {
            ...(data.codigo !== undefined && { codigo: data.codigo.trim() }),
            ...(data.nombre !== undefined && { nombre: data.nombre?.trim() || null }),
            ...(data.hectareas !== undefined && {
                hectareas: data.hectareas !== null ? Number(data.hectareas) : null,
            }),
            ...(data.ubicacion !== undefined && {
                ubicacion: data.ubicacion?.trim() || null,
            }),
            ...(data.observacion !== undefined && {
                observacion: data.observacion?.trim() || null,
            }),
            ...(data.activo !== undefined && { activo: data.activo }),
            ...(tipoCafe !== undefined && { tipo_cafe: tipoCafe }),
            ...(data.horas_oxidacion !== undefined && {
                horas_oxidacion: data.horas_oxidacion !== null ? Number(data.horas_oxidacion) : null,
            }),
            ...(data.horas_fermentacion !== undefined && {
                horas_fermentacion: data.horas_fermentacion !== null ? Number(data.horas_fermentacion) : null,
            }),
        },
    });
}

export async function eliminarLote(id: number) {
    return prisma.lote.delete({
        where: { id },
    });
}