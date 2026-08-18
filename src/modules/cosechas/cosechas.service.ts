import { prisma } from "../../config/prisma";

export type CosechaInput = {
    fecha: string;
    kilosCosechados: number;
    cantidadCosechadores?: number;
    lotes?: string;
    loteIds?: number[];
    totalHectareas: number;
    tipoCosecha?: string;
    trabajadorId: number;
    tipo_cosecha?: string;
    kilos_diarios?: number;
    kilos_quincena?: number;
    kilos_mensuales?: number;
    varietal?: string;
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
            lotes: lotesTexto,
            totalHectareas: Number(data.totalHectareas),
            tipoCosecha: tipoCosechaFinal,
            tipo_cosecha: tipoCosechaFinal,
            kilos_diarios: data.kilos_diarios !== undefined ? Number(data.kilos_diarios) : null,
            kilos_quincena: data.kilos_quincena !== undefined ? Number(data.kilos_quincena) : null,
            kilos_mensuales: data.kilos_mensuales !== undefined ? Number(data.kilos_mensuales) : null,
            varietal: data.varietal,

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
                ...(data.varietal !== undefined && { varietal: data.varietal }),
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

export async function obtenerReporteCosechas() {
    const cosechas = await prisma.cosecha.findMany({
        orderBy: { fecha: "asc" },
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

    const diaMap = new Map<
        string,
        {
            fecha: string;
            kilos: number;
            cantidadRegistros: number;
            detalles: {
                id: number;
                kilosCosechados: number;
                totalHectareas: number;
                tipoCosecha: string;
                varietal: string | null;
                lotes: { id: number; codigo: string; nombre: string | null; hectareas: number | null }[];
                trabajadores: { id: number; nombre: string; dni: string; kilosAsignados: number | null }[];
            }[];
        }
    >();

    const mesMap = new Map<string, number>();
    const quincenaMap = new Map<string, number>();
    const tipoMap = new Map<string, number>();
    const trabajadorMap = new Map<number, { trabajadorId: number; nombre: string; dni: string; kilos: number; cosechas: number }>();
    const loteMap = new Map<number, { loteId: number; codigo: string; nombre: string | null; kilos: number; cosechas: number }>();

    for (const c of cosechas) {
        const fechaObj = new Date(c.fecha);
        const yyyy = fechaObj.getFullYear();
        const mm = String(fechaObj.getMonth() + 1).padStart(2, "0");
        const dd = String(fechaObj.getDate()).padStart(2, "0");

        const diaKey = `${yyyy}-${mm}-${dd}`;
        let diaEntry = diaMap.get(diaKey);
        if (!diaEntry) {
            diaEntry = { fecha: diaKey, kilos: 0, cantidadRegistros: 0, detalles: [] };
            diaMap.set(diaKey, diaEntry);
        }
        diaEntry.kilos += c.kilosCosechados;
        diaEntry.cantidadRegistros += 1;
        diaEntry.detalles.push({
            id: c.id,
            kilosCosechados: c.kilosCosechados,
            totalHectareas: c.totalHectareas,
            tipoCosecha: c.tipoCosecha,
            varietal: c.varietal ?? null,
            lotes: c.cosechaLotes
                .filter((cl) => cl.lote)
                .map((cl) => ({
                    id: cl.lote.id,
                    codigo: cl.lote.codigo,
                    nombre: cl.lote.nombre ?? null,
                    hectareas: cl.lote.hectareas ?? null,
                })),
            trabajadores: c.CosechaTrabajador
                .filter((ct) => ct.Trabajador)
                .map((ct) => ({
                    id: ct.Trabajador.id,
                    nombre: `${ct.Trabajador.nombres}${ct.Trabajador.apellidos ? " " + ct.Trabajador.apellidos : ""}`,
                    dni: ct.Trabajador.dni || "",
                    kilosAsignados: ct.kilosAsignados ?? null,
                })),
        });

        const mesKey = `${yyyy}-${mm}`;
        mesMap.set(mesKey, (mesMap.get(mesKey) || 0) + c.kilosCosechados);

        const dayNum = fechaObj.getDate();
        const qNum = dayNum <= 15 ? 1 : 2;
        const quincenaKey = `${yyyy}-${mm}-Q${qNum}`;
        quincenaMap.set(quincenaKey, (quincenaMap.get(quincenaKey) || 0) + c.kilosCosechados);

        const tipoKey = c.tipoCosecha || "No especificado";
        tipoMap.set(tipoKey, (tipoMap.get(tipoKey) || 0) + c.kilosCosechados);

        for (const ct of c.CosechaTrabajador) {
            if (ct.Trabajador) {
                const tId = ct.Trabajador.id;
                const kilosTrabajador = ct.kilosAsignados ?? c.kilosCosechados;
                const prev = trabajadorMap.get(tId) || {
                    trabajadorId: tId,
                    nombre: `${ct.Trabajador.nombres}${ct.Trabajador.apellidos ? " " + ct.Trabajador.apellidos : ""}`,
                    dni: ct.Trabajador.dni || "",
                    kilos: 0,
                    cosechas: 0,
                };
                prev.kilos += kilosTrabajador;
                prev.cosechas += 1;
                trabajadorMap.set(tId, prev);
            }
        }

        for (const cl of c.cosechaLotes) {
            if (cl.lote) {
                const lId = cl.lote.id;
                const prev = loteMap.get(lId) || {
                    loteId: lId,
                    codigo: cl.lote.codigo,
                    nombre: cl.lote.nombre ?? null,
                    kilos: 0,
                    cosechas: 0,
                };
                prev.kilos += c.kilosCosechados;
                prev.cosechas += 1;
                loteMap.set(lId, prev);
            }
        }
    }

    const porDia = Array.from(diaMap.values());
    const porMes = Array.from(mesMap.entries()).map(([mes, kilos]) => ({ mes, kilos }));
    const porQuincena = Array.from(quincenaMap.entries()).map(([quincena, kilos]) => ({ quincena, kilos }));
    const porTipoCosecha = Array.from(tipoMap.entries()).map(([tipoCosecha, kilos]) => ({ tipoCosecha, kilos }));
    const porTrabajador = Array.from(trabajadorMap.values());
    const porLote = Array.from(loteMap.values());

    return {
        porDia,
        porMes,
        porQuincena,
        porTipoCosecha,
        porTrabajador,
        porLote,
    };
}
