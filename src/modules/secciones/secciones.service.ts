import { prisma } from "../../config/prisma";

type SeccionInput = {
    titulo: string;
    descripcion?: string | null;
    color: string;
};

export async function listarSecciones() {
    return prisma.seccionCosecha.findMany({
        orderBy: {
            id: "desc",
        },
    });
}

export async function crearSeccion(data: SeccionInput) {
    return prisma.seccionCosecha.create({
        data: {
            titulo: data.titulo.trim(),
            descripcion: data.descripcion?.trim() || null,
            color: data.color.trim(),
        },
    });
}

export async function obtenerSeccion(id: number) {
    return prisma.seccionCosecha.findUnique({
        where: { id },
    });
}

export async function actualizarSeccion(id: number, data: Partial<SeccionInput>) {
    return prisma.seccionCosecha.update({
        where: { id },
        data: {
            ...(data.titulo !== undefined && { titulo: data.titulo.trim() }),
            ...(data.descripcion !== undefined && {
                descripcion: data.descripcion?.trim() || null,
            }),
            ...(data.color !== undefined && { color: data.color.trim() }),
        },
    });
}

export async function eliminarSeccion(id: number) {
    return prisma.seccionCosecha.delete({
        where: { id },
    });
}

export async function obtenerCalculosGenerales() {
    const secciones = await prisma.seccionCosecha.findMany({
        include: {
            cosechas: true,
        },
        orderBy: {
            id: "asc",
        },
    });

    return secciones.map((seccion) => {
        const kilosTotales = seccion.cosechas.reduce(
            (total, cosecha) => total + cosecha.kilosCosechados,
            0,
        );

        const hectareasTotales = seccion.cosechas.reduce(
            (total, cosecha) => total + cosecha.totalHectareas,
            0,
        );

        const rendimiento =
            hectareasTotales > 0 ? kilosTotales / hectareasTotales : 0;

        return {
            seccionId: seccion.id,
            titulo: seccion.titulo,
            color: seccion.color,
            totalCosechas: seccion.cosechas.length,
            kilosTotales,
            hectareasTotales,
            rendimiento,
        };
    });
}
