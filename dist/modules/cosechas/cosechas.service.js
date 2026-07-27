"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarCosechas = listarCosechas;
exports.obtenerCosechaPorId = obtenerCosechaPorId;
exports.crearCosecha = crearCosecha;
exports.actualizarCosecha = actualizarCosecha;
exports.eliminarCosecha = eliminarCosecha;
exports.obtenerResumenCosechas = obtenerResumenCosechas;
exports.obtenerReporteCosechas = obtenerReporteCosechas;
// src/modules/cosechas/cosechas.service.ts
const prisma_1 = require("../../config/prisma");
async function listarCosechas() {
    return prisma_1.prisma.cosecha.findMany({
        include: {
            cosechaLotes: {
                include: {
                    lote: true,
                },
            },
            cosechaTrabajadores: {
                include: {
                    trabajador: true,
                },
            },
            procesos: true,
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
            cosechaLotes: {
                include: {
                    lote: true,
                },
            },
            cosechaTrabajadores: {
                include: {
                    trabajador: true,
                },
            },
            procesos: true,
        },
    });
}
async function crearCosecha(data) {
    const loteIds = data.loteIds ?? [];
    const trabajadores = data.trabajadores ?? [];
    const lotesTexto = data.lotes ||
        (loteIds.length > 0
            ? `Lotes seleccionados: ${loteIds.join(", ")}`
            : "");
    const cantidadCosechadores = data.cantidadCosechadores !== undefined
        ? Number(data.cantidadCosechadores)
        : trabajadores.length;
    if (loteIds.length === 0) {
        throw new Error("Debe seleccionar al menos un lote");
    }
    const lotesExistentes = await prisma_1.prisma.lote.findMany({
        where: {
            id: {
                in: loteIds.map(Number),
            },
            activo: true,
        },
        select: {
            id: true,
        },
    });
    if (lotesExistentes.length !== loteIds.length) {
        throw new Error("Uno o más lotes seleccionados no existen o están inactivos");
    }
    return prisma_1.prisma.cosecha.create({
        data: {
            fecha: new Date(data.fecha),
            kilosCosechados: Number(data.kilosCosechados),
            cantidadCosechadores,
            lotes: lotesTexto,
            totalHectareas: Number(data.totalHectareas),
            tipoCosecha: data.tipoCosecha,
            cosechaLotes: {
                create: loteIds.map((loteId) => ({
                    lote: {
                        connect: {
                            id: Number(loteId),
                        },
                    },
                })),
            },
            cosechaTrabajadores: {
                create: trabajadores.map((item) => ({
                    trabajador: {
                        connect: {
                            id: Number(item.trabajadorId),
                        },
                    },
                    kilosAsignados: item.kilosAsignados !== undefined &&
                        item.kilosAsignados !== null
                        ? Number(item.kilosAsignados)
                        : null,
                })),
            },
        },
        include: {
            cosechaLotes: {
                include: {
                    lote: true,
                },
            },
            cosechaTrabajadores: {
                include: {
                    trabajador: true,
                },
            },
            procesos: true,
        },
    });
}
async function actualizarCosecha(id, data) {
    const loteIds = data.loteIds;
    const trabajadores = data.trabajadores;
    return prisma_1.prisma.$transaction(async (tx) => {
        await tx.cosecha.update({
            where: { id },
            data: {
                ...(data.fecha && {
                    fecha: new Date(data.fecha),
                }),
                ...(data.kilosCosechados !== undefined && {
                    kilosCosechados: Number(data.kilosCosechados),
                }),
                ...(data.cantidadCosechadores !== undefined && {
                    cantidadCosechadores: Number(data.cantidadCosechadores),
                }),
                ...(data.lotes !== undefined && {
                    lotes: data.lotes,
                }),
                ...(data.totalHectareas !== undefined && {
                    totalHectareas: Number(data.totalHectareas),
                }),
                ...(data.tipoCosecha !== undefined && {
                    tipoCosecha: data.tipoCosecha,
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
                    data: trabajadores.map((item) => ({
                        cosechaId: id,
                        trabajadorId: Number(item.trabajadorId),
                        kilosAsignados: item.kilosAsignados !== undefined &&
                            item.kilosAsignados !== null
                            ? Number(item.kilosAsignados)
                            : null,
                    })),
                    skipDuplicates: true,
                });
            }
        }
        return tx.cosecha.findUnique({
            where: { id },
            include: {
                cosechaLotes: {
                    include: {
                        lote: true,
                    },
                },
                cosechaTrabajadores: {
                    include: {
                        trabajador: true,
                    },
                },
                procesos: true,
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
    });
    const kilosTotales = cosechas.reduce((total, cosecha) => total + cosecha.kilosCosechados, 0);
    const totalHectareas = cosechas.reduce((total, cosecha) => total + cosecha.totalHectareas, 0);
    const rendimiento = totalHectareas > 0 ? kilosTotales / totalHectareas : 0;
    return {
        totalCosechas: cosechas.length,
        kilosTotales,
        totalHectareas,
        rendimiento,
    };
}
async function obtenerReporteCosechas() {
    const cosechas = await prisma_1.prisma.cosecha.findMany({
        include: {
            cosechaTrabajadores: {
                include: {
                    trabajador: true,
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
    const porDia = new Map();
    const porMes = new Map();
    const porQuincena = new Map();
    const porTipoCosecha = new Map();
    const porTrabajador = new Map();
    const porLote = new Map();
    for (const cosecha of cosechas) {
        const fecha = new Date(cosecha.fecha);
        const diaKey = fecha.toISOString().slice(0, 10);
        const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
        const quincenaKey = `${mesKey}-Q${fecha.getDate() <= 15 ? "1" : "2"}`;
        porDia.set(diaKey, (porDia.get(diaKey) ?? 0) + cosecha.kilosCosechados);
        porMes.set(mesKey, (porMes.get(mesKey) ?? 0) + cosecha.kilosCosechados);
        porQuincena.set(quincenaKey, (porQuincena.get(quincenaKey) ?? 0) + cosecha.kilosCosechados);
        porTipoCosecha.set(cosecha.tipoCosecha, (porTipoCosecha.get(cosecha.tipoCosecha) ?? 0) +
            cosecha.kilosCosechados);
        for (const item of cosecha.cosechaTrabajadores) {
            const kilosTrabajador = item.kilosAsignados ?? cosecha.kilosCosechados / Math.max(cosecha.cosechaTrabajadores.length, 1);
            const actual = porTrabajador.get(item.trabajadorId) ?? {
                trabajadorId: item.trabajadorId,
                nombre: `${item.trabajador.nombres}${item.trabajador.apellidos ? ` ${item.trabajador.apellidos}` : ""}`,
                dni: item.trabajador.dni,
                kilos: 0,
                cosechas: 0,
            };
            actual.kilos += kilosTrabajador;
            actual.cosechas += 1;
            porTrabajador.set(item.trabajadorId, actual);
        }
        for (const item of cosecha.cosechaLotes) {
            const kilosLote = cosecha.cosechaLotes.length > 0
                ? cosecha.kilosCosechados / cosecha.cosechaLotes.length
                : cosecha.kilosCosechados;
            const actual = porLote.get(item.loteId) ?? {
                loteId: item.loteId,
                codigo: item.lote.codigo,
                nombre: item.lote.nombre,
                kilos: 0,
                cosechas: 0,
            };
            actual.kilos += kilosLote;
            actual.cosechas += 1;
            porLote.set(item.loteId, actual);
        }
    }
    return {
        porDia: Array.from(porDia.entries()).map(([fecha, kilos]) => ({
            fecha,
            kilos,
        })),
        porMes: Array.from(porMes.entries()).map(([mes, kilos]) => ({
            mes,
            kilos,
        })),
        porQuincena: Array.from(porQuincena.entries()).map(([quincena, kilos]) => ({
            quincena,
            kilos,
        })),
        porTipoCosecha: Array.from(porTipoCosecha.entries()).map(([tipoCosecha, kilos]) => ({
            tipoCosecha,
            kilos,
        })),
        porTrabajador: Array.from(porTrabajador.values()).sort((a, b) => b.kilos - a.kilos),
        porLote: Array.from(porLote.values()).sort((a, b) => b.kilos - a.kilos),
    };
}
//# sourceMappingURL=cosechas.service.js.map