import { prisma } from "../../config/prisma";

type LoteInput = {
    codigo: string;
    nombre?: string;
    hectareas?: number;
    ubicacion?: string;
    observacion?: string;
    activo?: boolean;
};

export async function listarLotes() {
    return prisma.lote.findMany({
        orderBy: {
            id: "desc",
        },
    });
}

export async function crearLote(data: LoteInput) {
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
        },
    });
}

export async function actualizarLote(id: number, data: Partial<LoteInput>) {
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
        },
    });
}

export async function eliminarLote(id: number) {
    return prisma.lote.delete({
        where: { id },
    });
}