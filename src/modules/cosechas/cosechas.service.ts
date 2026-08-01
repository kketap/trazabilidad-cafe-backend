// src/modules/cosechas/cosechas.service.ts
import { prisma } from "../../config/prisma";

export type CosechaTrabajadorInput = {
    trabajadorId: number;
    kilosAsignados?: number | null;
};

export type CosechaInput = {
    fecha: string;
    kilosCosechados: number;
    cantidadCosechadores?: number;

    lotes?: string;
    loteIds?: number[];

    totalHectareas: number;

    tipoCosecha?: string;

    // Compatibilidad con versión antigua de un solo trabajador
    trabajadorId?: number;

    // Nueva versión: varios trabajadores
    trabajadores?: CosechaTrabajadorInput[];

    // Compatibilidad con payloads antiguos
    tipo_cosecha?: string;
    kilos_diarios?: number;
    kilos_quincena?: number;
    kilos_mensuales?: number;

    varietal?: string | string[] | null;
};

type ResumenFiltros = {
    desde?: Date;
    hasta?: Date;
};

export function normalizeTipoCosecha(val?: string): string {
    if (!val) return "plena";

    const lower = val.toLowerCase().trim();

    if (lower === "manual") return "plena";
    if (lower === "rebusque") return "rebusca";
    if (lower === "selectiva") return "selectiva";
    if (lower === "rebusca") return "rebusca";
    if (lower === "plena") return "plena";

    return lower;
}

function normalizeVarietal(value?: string | string[] | null): string | null {
    if (Array.isArray(value)) {
        return value.filter(Boolean).join(", ");
    }

    return value ?? null;
}

function buildTrabajadoresInput(data: CosechaInput): CosechaTrabajadorInput[] {
    if (Array.isArray(data.trabajadores) && data.trabajadores.length > 0) {
        return data.trabajadores;
    }

    if (data.trabajadorId !== undefined && data.trabajadorId !== null) {
        return [
            {
                trabajadorId: Number(data.trabajadorId),
            },
        ];
    }

    return [];
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
            procesos: true,
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
            procesos: true,
        },
    });
}

export async function crearCosecha(data: CosechaInput) {
    const loteIds = data.loteIds ?? [];
    const trabajadores = buildTrabajadoresInput(data);

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
            lotes: lotesTexto,
            totalHectareas: Number(data.totalHectareas),
            tipoCosecha: tipoCosechaFinal,
            varietal: normalizeVarietal(data.varietal),

            cosechaLotes:
                loteIds.length > 0
                    ? {
                        create: loteIds.map((loteId) => ({
                            lote: {
                                connect: {
                                    id: Number(loteId),
                                },
                            },
                        })),
                    }
                    : undefined,

            CosechaTrabajador:
                trabajadores.length > 0
                    ? {
                        create: trabajadores.map(
                            (item: CosechaTrabajadorInput) => ({
                                Trabajador: {
                                    connect: {
                                        id: Number(item.trabajadorId),
                                    },
                                },
                                kilosAsignados:
                                    item.kilosAsignados !== undefined &&
                                        item.kilosAsignados !== null
                                        ? Number(item.kilosAsignados)
                                        : null,
                            }),
                        ),
                    }
                    : undefined,
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
            procesos: true,
        },
    });
}

export async function actualizarCosecha(
    id: number,
    data: Partial<CosechaInput>,
) {
    const loteIds = data.loteIds;
    const trabajadores = data.trabajadores;

    const rawTipo = data.tipo_cosecha || data.tipoCosecha;
    const tipoCosechaFinal =
        rawTipo !== undefined ? normalizeTipoCosecha(rawTipo) : undefined;

    return prisma.$transaction(async (tx) => {
        await tx.cosecha.update({
            where: { id },
            data: {
                ...(data.fecha && {
                    fecha: new Date(data.fecha),
                }),
                ...(data.kilosCosechados !== undefined && {
                    kilosCosechados: Number(data.kilosCosechados),
                }),
                ...(data.lotes !== undefined && {
                    lotes: data.lotes,
                }),
                ...(data.totalHectareas !== undefined && {
                    totalHectareas: Number(data.totalHectareas),
                }),
                ...(tipoCosechaFinal !== undefined && {
                    tipoCosecha: tipoCosechaFinal,
                }),
                ...(data.varietal !== undefined && {
                    varietal: normalizeVarietal(data.varietal),
                }),
            },
        });

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

        if (trabajadores !== undefined) {
            await tx.cosechaTrabajador.deleteMany({
                where: {
                    cosechaId: id,
                },
            });

            if (trabajadores.length > 0) {
                await tx.cosechaTrabajador.createMany({
                    data: trabajadores.map(
                        (item: CosechaTrabajadorInput) => ({
                            cosechaId: id,
                            trabajadorId: Number(item.trabajadorId),
                            kilosAsignados:
                                item.kilosAsignados !== undefined &&
                                    item.kilosAsignados !== null
                                    ? Number(item.kilosAsignados)
                                    : null,
                        }),
                    ),
                    skipDuplicates: true,
                });
            }
        }

        if (
            trabajadores === undefined &&
            data.trabajadorId !== undefined &&
            data.trabajadorId !== null
        ) {
            await tx.cosechaTrabajador.deleteMany({
                where: {
                    cosechaId: id,
                },
            });

            await tx.cosechaTrabajador.create({
                data: {
                    cosechaId: id,
                    trabajadorId: Number(data.trabajadorId),
                },
            });
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
                procesos: true,
            },
        });
    });
}

export async function eliminarCosecha(id: number) {
    return prisma.cosecha.delete({
        where: { id },
    });
}

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
        (total, cosecha) => total + Number(cosecha.kilosCosechados ?? 0),
        0,
    );

    const totalHectareas = cosechas.reduce(
        (total, cosecha) => total + Number(cosecha.totalHectareas ?? 0),
        0,
    );

    const rendimiento =
        totalHectareas > 0 ? kilosTotales / totalHectareas : 0;

    const trabajadorKilos = new Map<
        number,
        {
            id: number;
            nombre: string;
            kilos: number;
        }
    >();

    for (const cosecha of cosechas) {
        const trabajadoresCosecha = cosecha.CosechaTrabajador ?? [];

        for (const item of trabajadoresCosecha) {
            if (!item.Trabajador) continue;

            const kilosTrabajador =
                item.kilosAsignados ??
                Number(cosecha.kilosCosechados ?? 0) /
                Math.max(trabajadoresCosecha.length, 1);

            const trabajadorId = item.Trabajador.id;

            const actual = trabajadorKilos.get(trabajadorId) ?? {
                id: trabajadorId,
                nombre: `${item.Trabajador.nombres}${item.Trabajador.apellidos
                        ? ` ${item.Trabajador.apellidos}`
                        : ""
                    }`,
                kilos: 0,
            };

            actual.kilos += kilosTrabajador;
            trabajadorKilos.set(trabajadorId, actual);
        }
    }

    let mejorTrabajador: {
        id: number;
        nombre: string;
        kilos: number;
    } | null = null;

    for (const trabajador of trabajadorKilos.values()) {
        if (
            !mejorTrabajador ||
            trabajador.kilos > mejorTrabajador.kilos
        ) {
            mejorTrabajador = trabajador;
        }
    }

    const loteKilos = new Map<
        number,
        {
            id: number;
            codigo: string;
            nombre?: string | null;
            kilos: number;
        }
    >();

    for (const cosecha of cosechas) {
        const lotesCosecha = cosecha.cosechaLotes ?? [];

        for (const item of lotesCosecha) {
            if (!item.lote) continue;

            const kilosLote =
                Number(cosecha.kilosCosechados ?? 0) /
                Math.max(lotesCosecha.length, 1);

            const loteId = item.lote.id;

            const actual = loteKilos.get(loteId) ?? {
                id: loteId,
                codigo: item.lote.codigo,
                nombre: item.lote.nombre,
                kilos: 0,
            };

            actual.kilos += kilosLote;
            loteKilos.set(loteId, actual);
        }
    }

    let mejorLote: {
        id: number;
        codigo: string;
        nombre?: string | null;
        kilos: number;
    } | null = null;

    for (const lote of loteKilos.values()) {
        if (!mejorLote || lote.kilos > mejorLote.kilos) {
            mejorLote = lote;
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

export async function obtenerReporteCosechas() {
    const cosechas = await prisma.cosecha.findMany({
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
            fecha: "asc",
        },
    });

    const porDiaMap = new Map<string, number>();
    const porMesMap = new Map<string, number>();
    const porQuincenaMap = new Map<string, number>();
    const porTipoCosechaMap = new Map<string, number>();

    const porTrabajadorMap = new Map<
        number,
        {
            trabajadorId: number;
            nombre: string;
            dni: string;
            kilos: number;
            cosechas: number;
        }
    >();

    const porLoteMap = new Map<
        number,
        {
            loteId: number;
            codigo: string;
            nombre: string | null;
            kilos: number;
            cosechas: number;
        }
    >();

    for (const cosecha of cosechas) {
        const kilos = Number(cosecha.kilosCosechados ?? 0);
        const fecha = new Date(cosecha.fecha);

        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, "0");
        const day = String(fecha.getDate()).padStart(2, "0");

        const fechaKey = `${year}-${month}-${day}`;
        const mesKey = `${year}-${month}`;
        const quincenaKey = `${year}-${month}-${fecha.getDate() <= 15 ? "Q1" : "Q2"
            }`;
        const tipoCosechaKey = cosecha.tipoCosecha || "plena";

        porDiaMap.set(fechaKey, (porDiaMap.get(fechaKey) ?? 0) + kilos);
        porMesMap.set(mesKey, (porMesMap.get(mesKey) ?? 0) + kilos);

        porQuincenaMap.set(
            quincenaKey,
            (porQuincenaMap.get(quincenaKey) ?? 0) + kilos,
        );

        porTipoCosechaMap.set(
            tipoCosechaKey,
            (porTipoCosechaMap.get(tipoCosechaKey) ?? 0) + kilos,
        );

        const trabajadoresCosecha = cosecha.CosechaTrabajador ?? [];

        for (const item of trabajadoresCosecha) {
            if (!item.Trabajador) continue;

            const kilosTrabajador =
                item.kilosAsignados ??
                kilos / Math.max(trabajadoresCosecha.length, 1);

            const actual = porTrabajadorMap.get(item.trabajadorId) ?? {
                trabajadorId: item.trabajadorId,
                nombre: `${item.Trabajador.nombres}${item.Trabajador.apellidos
                        ? ` ${item.Trabajador.apellidos}`
                        : ""
                    }`,
                dni: item.Trabajador.dni,
                kilos: 0,
                cosechas: 0,
            };

            actual.kilos += kilosTrabajador;
            actual.cosechas += 1;

            porTrabajadorMap.set(item.trabajadorId, actual);
        }

        const lotesCosecha = cosecha.cosechaLotes ?? [];

        for (const item of lotesCosecha) {
            if (!item.lote) continue;

            const kilosLote = kilos / Math.max(lotesCosecha.length, 1);

            const actual = porLoteMap.get(item.loteId) ?? {
                loteId: item.loteId,
                codigo: item.lote.codigo,
                nombre: item.lote.nombre ?? null,
                kilos: 0,
                cosechas: 0,
            };

            actual.kilos += kilosLote;
            actual.cosechas += 1;

            porLoteMap.set(item.loteId, actual);
        }
    }

    return {
        porDia: Array.from(porDiaMap.entries()).map(([fecha, kilos]) => ({
            fecha,
            kilos,
        })),

        porMes: Array.from(porMesMap.entries()).map(([mes, kilos]) => ({
            mes,
            kilos,
        })),

        porQuincena: Array.from(porQuincenaMap.entries()).map(
            ([quincena, kilos]) => ({
                quincena,
                kilos,
            }),
        ),

        porTipoCosecha: Array.from(porTipoCosechaMap.entries()).map(
            ([tipoCosecha, kilos]) => ({
                tipoCosecha,
                kilos,
            }),
        ),

        porTrabajador: Array.from(porTrabajadorMap.values()).sort(
            (a, b) => b.kilos - a.kilos,
        ),

        porLote: Array.from(porLoteMap.values()).sort(
            (a, b) => b.kilos - a.kilos,
        ),
    };
}