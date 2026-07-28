import { prisma } from "../../config/prisma";

export type CosechaInput = {
    fecha: string;
    kilosCosechados: number;
    cantidadCosechadores: number;
    lotes?: string;
    loteIds?: number[];
    totalHectareas: number;
    tipoCosecha?: string;
    trabajadorId: number;
    tipo_cosecha?: string;
    kilos_diarios?: number;
    kilos_quincena?: number;
    kilos_mensuales?: number;
};

export function normalizeTipoCosecha(val?: string): string {
    if (!val) return "plena";
    const lower = val.toLowerCase().trim();
    if (lower === "manual") return "plena";
    if (lower === "rebusque") return "rebusca";
    if (lower === "selectiva") return "selectiva";
    return lower;
}

export async function listarCosechas() {
    return prisma.cosecha.findMany({
        include: {
            CosechaTrabajador: {
                include: {
                    Trabajador: true,
                },
            },
            cosechaLotes: {
                include: {
                    lote: true,
                },
            },
        },
        orderBy: {
            fecha: "desc",
        },
    });
}

export async function obtenerCosechaPorId(id: number) {
    return prisma.cosecha.findUnique({
        where: { id },
        include: {
            CosechaTrabajador: {
                include: {
                    Trabajador: true,
                },
            },
            cosechaLotes: {
                include: {
                    lote: true,
                },
            },
        },
    });
}

export async function crearCosecha(data: CosechaInput) {
    const loteIds = data.loteIds ?? [];

    const lotesTexto =
        data.lotes ||
        (loteIds.length > 0
            ? `Lotes seleccionados: ${loteIds.join(", ")}`
            : "");

    const rawTipo = data.tipo_cosecha || data.tipoCosecha;
    const tipoCosechaFinal = normalizeTipoCosecha(rawTipo);

    return prisma.cosecha.create({
        data: {
            fecha: new Date(data.fecha),
            kilosCosechados: Number(data.kilosCosechados),
            cantidadCosechadores: Number(data.cantidadCosechadores),
            lotes: lotesTexto,
            totalHectareas: Number(data.totalHectareas),
            tipoCosecha: tipoCosechaFinal,
            tipo_cosecha: tipoCosechaFinal,
            kilos_diarios: data.kilos_diarios !== undefined ? Number(data.kilos_diarios) : null,
            kilos_quincena: data.kilos_quincena !== undefined ? Number(data.kilos_quincena) : null,
            kilos_mensuales: data.kilos_mensuales !== undefined ? Number(data.kilos_mensuales) : null,

            // Relación a través de la tabla intermedia
            CosechaTrabajador: {
                create: {
                    trabajadorId: Number(data.trabajadorId),
                },
            },
            cosechaLotes: {
                create: loteIds.map((loteId) => ({
                    lote: {
                        connect: {
                            id: Number(loteId),
                        },
                    },
                })),
            },
        },
        include: {
            CosechaTrabajador: {
                include: {
                    Trabajador: true,
                },
            },
            cosechaLotes: {
                include: {
                    lote: true,
                },
            },
        },
    });
}

export async function actualizarCosecha(id: number, data: Partial<CosechaInput>) {
    const loteIds = data.loteIds;
    const rawTipo = data.tipo_cosecha || data.tipoCosecha;
    const tipoCosechaFinal = rawTipo !== undefined ? normalizeTipoCosecha(rawTipo) : undefined;

    return prisma.$transaction(async (tx) => {
        // Actualización de la entidad principal omitiendo trabajadorId
        await tx.cosecha.update({
            where: { id },
            data: {
                ...(data.fecha && { fecha: new Date(data.fecha) }),
                ...(data.kilosCosechados !== undefined && {
                    kilosCosechados: Number(data.kilosCosechados),
                }),
                ...(data.cantidadCosechadores !== undefined && {
                    cantidadCosechadores: Number(data.cantidadCosechadores),
                }),
                ...(data.lotes !== undefined && { lotes: data.lotes }),
                ...(data.totalHectareas !== undefined && {
                    totalHectareas: Number(data.totalHectareas),
                }),
                ...(tipoCosechaFinal !== undefined && {
                    tipoCosecha: tipoCosechaFinal,
                    tipo_cosecha: tipoCosechaFinal,
                }),
                ...(data.kilos_diarios !== undefined && {
                    kilos_diarios: data.kilos_diarios ? Number(data.kilos_diarios) : null,
                }),
                ...(data.kilos_quincena !== undefined && {
                    kilos_quincena: data.kilos_quincena ? Number(data.kilos_quincena) : null,
                }),
                ...(data.kilos_mensuales !== undefined && {
                    kilos_mensuales: data.kilos_mensuales ? Number(data.kilos_mensuales) : null,
                }),
            },
        });

        // Reconstrucción de la relación con Trabajador si viene en el payload
        if (data.trabajadorId !== undefined) {
            await tx.cosechaTrabajador.deleteMany({
                where: { cosechaId: id },
            });

            await tx.cosechaTrabajador.create({
                data: {
                    cosechaId: id,
                    trabajadorId: Number(data.trabajadorId),
                },
            });
        }

        // Reconstrucción de la relación con Lotes
        if (loteIds !== undefined) {
            await tx.cosechaLote.deleteMany({
                where: {
                    cosechaId: id,
                },
            });

            if (loteIds.length > 0) {
                await tx.cosechaLote.createMany({
                    data: loteIds.map((loteId) => ({
                        cosechaId: id,
                        loteId: Number(loteId),
                    })),
                    skipDuplicates: true,
                });
            }
        }

        return tx.cosecha.findUnique({
            where: { id },
            include: {
                CosechaTrabajador: {
                    include: {
                        Trabajador: true,
                    },
                },
                cosechaLotes: {
                    include: {
                        lote: true,
                    },
                },
            },
        });
    });
}

export async function eliminarCosecha(id: number) {
    return prisma.cosecha.delete({
        where: { id },
    });
}

type ResumenFiltros = {
    desde?: Date;
    hasta?: Date;
};

export async function obtenerResumenCosechas(filtros: ResumenFiltros = {}) {
    const cosechas = await prisma.cosecha.findMany({
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
        include: {
            CosechaTrabajador: {
                include: {
                    Trabajador: true,
                },
            },
            cosechaLotes: {
                include: {
                    lote: true,
                },
            },
        },
    });

    const kilosTotales = cosechas.reduce(
        (total, cosecha) => total + cosecha.kilosCosechados,
        0,
    );

    const totalHectareas = cosechas.reduce(
        (total, cosecha) => total + cosecha.totalHectareas,
        0,
    );

    const rendimiento =
        totalHectareas > 0 ? kilosTotales / totalHectareas : 0;

    // Mejor trabajador
    const trabajadorKilos = new Map<number, { id: number; nombre: string; kilos: number }>();
    for (const c of cosechas) {
        for (const ct of c.CosechaTrabajador) {
            if (ct.Trabajador) {
                const tId = ct.Trabajador.id;
                const cur = trabajadorKilos.get(tId) || {
                    id: tId,
                    nombre: `${ct.Trabajador.nombres}${ct.Trabajador.apellidos ? " " + ct.Trabajador.apellidos : ""}`,
                    kilos: 0,
                };
                cur.kilos += c.kilosCosechados;
                trabajadorKilos.set(tId, cur);
            }
        }
    }
    let mejorTrabajador: { id: number; nombre: string; kilos: number } | null = null;
    for (const t of trabajadorKilos.values()) {
        if (!mejorTrabajador || t.kilos > mejorTrabajador.kilos) {
            mejorTrabajador = t;
        }
    }

    // Mejor lote
    const loteKilos = new Map<number, { id: number; codigo: string; nombre?: string | null; kilos: number }>();
    for (const c of cosechas) {
        for (const cl of c.cosechaLotes) {
            if (cl.lote) {
                const lId = cl.lote.id;
                const cur = loteKilos.get(lId) || {
                    id: lId,
                    codigo: cl.lote.codigo,
                    nombre: cl.lote.nombre,
                    kilos: 0,
                };
                cur.kilos += c.kilosCosechados;
                loteKilos.set(lId, cur);
            }
        }
    }
    let mejorLote: { id: number; codigo: string; nombre?: string | null; kilos: number } | null = null;
    for (const l of loteKilos.values()) {
        if (!mejorLote || l.kilos > mejorLote.kilos) {
            mejorLote = l;
        }
    }

    return {
        totalCosechas: cosechas.length,
        kilosTotales,
        totalHectareas,
        rendimiento,
        mejorTrabajador,
        mejorLote,
    };
}