"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeTipoCosecha = normalizeTipoCosecha;
exports.listarCosechas = listarCosechas;
exports.obtenerCosechaPorId = obtenerCosechaPorId;
exports.crearCosecha = crearCosecha;
exports.actualizarCosecha = actualizarCosecha;
exports.eliminarCosecha = eliminarCosecha;
exports.obtenerResumenCosechas = obtenerResumenCosechas;
const prisma_1 = require("../../config/prisma");
function normalizeTipoCosecha(val) {
    if (!val)
        return "plena";
    const lower = val.toLowerCase().trim();
    if (lower === "manual")
        return "plena";
    if (lower === "rebusque")
        return "rebusca";
    if (lower === "selectiva")
        return "selectiva";
    return lower;
}
async function listarCosechas() {
    return prisma_1.prisma.cosecha.findMany({
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
async function obtenerCosechaPorId(id) {
    return prisma_1.prisma.cosecha.findUnique({
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
async function crearCosecha(data) {
    const loteIds = data.loteIds ?? [];
    const lotesTexto = data.lotes ||
        (loteIds.length > 0
            ? `Lotes seleccionados: ${loteIds.join(", ")}`
            : "");
    const rawTipo = data.tipo_cosecha || data.tipoCosecha;
    const tipoCosechaFinal = normalizeTipoCosecha(rawTipo);
    return prisma_1.prisma.cosecha.create({
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
async function actualizarCosecha(id, data) {
    const loteIds = data.loteIds;
    const rawTipo = data.tipo_cosecha || data.tipoCosecha;
    const tipoCosechaFinal = rawTipo !== undefined ? normalizeTipoCosecha(rawTipo) : undefined;
    return prisma_1.prisma.$transaction(async (tx) => {
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
async function eliminarCosecha(id) {
    return prisma_1.prisma.cosecha.delete({
        where: { id },
    });
}
async function obtenerResumenCosechas(filtros = {}) {
    const cosechas = await prisma_1.prisma.cosecha.findMany({
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
    const kilosTotales = cosechas.reduce((total, cosecha) => total + cosecha.kilosCosechados, 0);
    const totalHectareas = cosechas.reduce((total, cosecha) => total + cosecha.totalHectareas, 0);
    const rendimiento = totalHectareas > 0 ? kilosTotales / totalHectareas : 0;
    // Mejor trabajador
    const trabajadorKilos = new Map();
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
    let mejorTrabajador = null;
    for (const t of trabajadorKilos.values()) {
        if (!mejorTrabajador || t.kilos > mejorTrabajador.kilos) {
            mejorTrabajador = t;
        }
    }
    // Mejor lote
    const loteKilos = new Map();
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
    let mejorLote = null;
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
//# sourceMappingURL=cosechas.service.js.map