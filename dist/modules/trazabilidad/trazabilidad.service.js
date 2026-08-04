"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarProcesos = listarProcesos;
exports.crearProceso = crearProceso;
exports.actualizarProceso = actualizarProceso;
exports.eliminarProceso = eliminarProceso;
exports.obtenerResumenTrazabilidad = obtenerResumenTrazabilidad;
// src/modules/trazabilidad/trazabilidad.service.ts
const client_1 = require("@prisma/client");
const prisma_1 = require("../../config/prisma");
/**
 * Relaciones devueltas junto con cada proceso.
 *
 * La relación se llama "Lote" porque así está definida actualmente
 * en schema.prisma.
 */
const procesoInclude = {
    cosecha: true,
    Lote: {
        include: {
            cosechaLotes: {
                include: {
                    cosecha: true,
                },
            },
        },
    },
};
function calculateDurationHours(start, end, fallback = 0) {
    if (start && end) {
        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();
        const difference = endTime - startTime;
        if (difference > 0) {
            return difference / (1000 * 60 * 60);
        }
    }
    return fallback;
}
function getFechaKey(value) {
    const fecha = value instanceof Date ? value : new Date(value);
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
function getDateRange(fecha) {
    const desde = new Date(fecha);
    desde.setHours(0, 0, 0, 0);
    const hasta = new Date(desde);
    hasta.setDate(hasta.getDate() + 1);
    return {
        desde,
        hasta,
    };
}
function buildProcesoCode(fecha, correlativo) {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");
    return `PRO-${year}${month}${day}-${String(correlativo).padStart(4, "0")}`;
}
function normalizeTipoProceso(tipoProceso) {
    if (!tipoProceso) {
        return null;
    }
    if (!Object.values(client_1.TipoProceso).includes(tipoProceso)) {
        throw new Error("El tipo de proceso no es válido");
    }
    return tipoProceso;
}
function parseFecha(value, nombreCampo) {
    const fecha = new Date(value);
    if (Number.isNaN(fecha.getTime())) {
        throw new Error(`${nombreCampo} no es válida`);
    }
    return fecha;
}
/**
 * Valida la relación entre kilos ingresados y kilos resultantes.
 *
 * La merma no se almacena: se calcula cuando se necesita mostrar
 * o resumir la información.
 */
function validarKilos(kilosIngresados, kilosResultantes) {
    if (!Number.isFinite(kilosIngresados) || kilosIngresados <= 0) {
        throw new Error("Los kilos ingresados deben ser mayores que cero");
    }
    /*
     * Se permite null solamente para conservar registros históricos.
     * Los procesos nuevos siempre deben enviar kilosResultantes.
     */
    if (kilosResultantes === null) {
        return;
    }
    if (!Number.isFinite(kilosResultantes) || kilosResultantes < 0) {
        throw new Error("Los kilos resultantes deben ser iguales o mayores que cero");
    }
    if (kilosResultantes > kilosIngresados) {
        throw new Error("Los kilos resultantes no pueden superar los kilos ingresados");
    }
}
async function listarProcesos() {
    return prisma_1.prisma.procesoTrazabilidad.findMany({
        include: procesoInclude,
        orderBy: {
            fecha: "desc",
        },
    });
}
async function crearProceso(data) {
    const kilosIngresados = Number(data.kilosIngresados);
    const kilosResultantes = Number(data.kilosResultantes);
    validarKilos(kilosIngresados, kilosResultantes);
    const fecha = parseFecha(data.fecha, "La fecha del proceso");
    const fechaInicio = data.fechaInicio
        ? parseFecha(data.fechaInicio, "La fecha de inicio")
        : null;
    const fechaFin = data.fechaFin
        ? parseFecha(data.fechaFin, "La fecha de término")
        : null;
    if (fechaInicio &&
        fechaFin &&
        fechaFin.getTime() <= fechaInicio.getTime()) {
        throw new Error("La fecha de término debe ser posterior a la fecha de inicio");
    }
    const duracionHoras = calculateDurationHours(fechaInicio, fechaFin, data.duracionHoras !== undefined
        ? Number(data.duracionHoras)
        : 0);
    if (!Number.isFinite(duracionHoras) || duracionHoras < 0) {
        throw new Error("La duración del proceso no es válida");
    }
    const tipoProceso = normalizeTipoProceso(data.tipoProceso);
    let cosechaIdFinal = data.cosechaId !== undefined && data.cosechaId !== null
        ? Number(data.cosechaId)
        : null;
    const loteIdFinal = data.loteId !== undefined && data.loteId !== null
        ? Number(data.loteId)
        : null;
    if (loteIdFinal !== null) {
        const lote = await prisma_1.prisma.lote.findUnique({
            where: {
                id: loteIdFinal,
            },
            include: {
                cosechaLotes: {
                    include: {
                        cosecha: true,
                    },
                },
            },
        });
        if (!lote) {
            throw new Error("El lote seleccionado no existe");
        }
        if (!lote.activo) {
            throw new Error("El lote seleccionado se encuentra inactivo");
        }
        const kilosDisponibles = lote.kilosActuales ?? lote.kilosIniciales;
        if (kilosDisponibles !== null &&
            kilosDisponibles !== undefined &&
            kilosIngresados > kilosDisponibles) {
            throw new Error(`Los kilos ingresados no pueden superar los kilos disponibles del lote (${kilosDisponibles} kg)`);
        }
        /*
         * Si no se envía cosechaId, intenta encontrar una cosecha del lote
         * cuya fecha coincida con la fecha registrada para el proceso.
         */
        if (cosechaIdFinal === null) {
            const fechaProcesoKey = getFechaKey(fecha);
            const cosechaRelacionada = lote.cosechaLotes.find((relacion) => getFechaKey(relacion.cosecha.fecha) ===
                fechaProcesoKey);
            if (cosechaRelacionada) {
                cosechaIdFinal = cosechaRelacionada.cosechaId;
            }
        }
    }
    return prisma_1.prisma.$transaction(async (tx) => {
        let codigo = data.codigo?.trim();
        if (!codigo) {
            const { desde, hasta } = getDateRange(fecha);
            const cantidadProcesosDia = await tx.procesoTrazabilidad.count({
                where: {
                    fecha: {
                        gte: desde,
                        lt: hasta,
                    },
                },
            });
            let correlativo = cantidadProcesosDia + 1;
            codigo = buildProcesoCode(fecha, correlativo);
            /*
             * Evita una colisión si hubo eliminaciones o creaciones
             * concurrentes que dejaron ocupado el correlativo calculado.
             */
            while (await tx.procesoTrazabilidad.findUnique({
                where: {
                    codigo,
                },
                select: {
                    id: true,
                },
            })) {
                correlativo += 1;
                codigo = buildProcesoCode(fecha, correlativo);
            }
        }
        return tx.procesoTrazabilidad.create({
            data: {
                codigo,
                fecha,
                fechaInicio,
                fechaFin,
                duracionHoras,
                etapa: data.etapa?.trim() || null,
                tipoProceso,
                kilosIngresados,
                kilosResultantes,
                loteId: loteIdFinal,
                cosechaId: cosechaIdFinal,
            },
            include: procesoInclude,
        });
    });
}
async function actualizarProceso(id, data) {
    const procesoActual = await prisma_1.prisma.procesoTrazabilidad.findUnique({
        where: {
            id,
        },
    });
    if (!procesoActual) {
        throw new Error("Proceso no encontrado");
    }
    /*
     * Se calculan los valores finales porque modificar kilosIngresados
     * también puede volver inválido el kilosResultantes que ya existía.
     */
    const kilosIngresadosFinal = data.kilosIngresados !== undefined
        ? Number(data.kilosIngresados)
        : procesoActual.kilosIngresados;
    const kilosResultantesFinal = data.kilosResultantes !== undefined
        ? Number(data.kilosResultantes)
        : procesoActual.kilosResultantes;
    validarKilos(Number(kilosIngresadosFinal), kilosResultantesFinal !== null
        ? Number(kilosResultantesFinal)
        : null);
    const fecha = data.fecha !== undefined
        ? parseFecha(data.fecha, "La fecha del proceso")
        : undefined;
    const fechaInicio = data.fechaInicio !== undefined
        ? data.fechaInicio
            ? parseFecha(data.fechaInicio, "La fecha de inicio")
            : null
        : undefined;
    const fechaFin = data.fechaFin !== undefined
        ? data.fechaFin
            ? parseFecha(data.fechaFin, "La fecha de término")
            : null
        : undefined;
    const fechaInicioFinal = fechaInicio !== undefined
        ? fechaInicio
        : procesoActual.fechaInicio;
    const fechaFinFinal = fechaFin !== undefined
        ? fechaFin
        : procesoActual.fechaFin;
    if (fechaInicioFinal &&
        fechaFinFinal &&
        fechaFinFinal.getTime() <= fechaInicioFinal.getTime()) {
        throw new Error("La fecha de término debe ser posterior a la fecha de inicio");
    }
    let duracionHoras;
    if (data.fechaInicio !== undefined ||
        data.fechaFin !== undefined) {
        duracionHoras = calculateDurationHours(fechaInicioFinal, fechaFinFinal, data.duracionHoras !== undefined
            ? Number(data.duracionHoras)
            : procesoActual.duracionHoras);
    }
    else if (data.duracionHoras !== undefined) {
        duracionHoras = Number(data.duracionHoras);
    }
    if (duracionHoras !== undefined &&
        (!Number.isFinite(duracionHoras) || duracionHoras < 0)) {
        throw new Error("La duración del proceso no es válida");
    }
    const tipoProceso = data.tipoProceso !== undefined
        ? normalizeTipoProceso(data.tipoProceso)
        : undefined;
    const loteIdFinal = data.loteId !== undefined
        ? data.loteId !== null
            ? Number(data.loteId)
            : null
        : procesoActual.loteId;
    /*
     * Se vuelve a validar el lote cuando cambia el lote o la cantidad
     * ingresada. Esto impide actualizar el proceso con un lote inexistente.
     */
    if (loteIdFinal !== null &&
        (data.loteId !== undefined ||
            data.kilosIngresados !== undefined)) {
        const lote = await prisma_1.prisma.lote.findUnique({
            where: {
                id: loteIdFinal,
            },
        });
        if (!lote) {
            throw new Error("El lote seleccionado no existe");
        }
        /*
         * Se permite conservar el lote original si fue desactivado después
         * de registrar el proceso, pero no seleccionar otro lote inactivo.
         */
        if (!lote.activo && lote.id !== procesoActual.loteId) {
            throw new Error("El lote seleccionado se encuentra inactivo");
        }
        const kilosDisponibles = lote.kilosActuales ?? lote.kilosIniciales;
        if (kilosDisponibles !== null &&
            kilosDisponibles !== undefined &&
            kilosIngresadosFinal > kilosDisponibles) {
            throw new Error(`Los kilos ingresados no pueden superar los kilos disponibles del lote (${kilosDisponibles} kg)`);
        }
    }
    return prisma_1.prisma.procesoTrazabilidad.update({
        where: {
            id,
        },
        data: {
            ...(fecha !== undefined && {
                fecha,
            }),
            ...(data.loteId !== undefined && {
                loteId: loteIdFinal,
            }),
            ...(data.cosechaId !== undefined && {
                cosechaId: data.cosechaId !== null
                    ? Number(data.cosechaId)
                    : null,
            }),
            ...(data.etapa !== undefined && {
                etapa: data.etapa?.trim() || null,
            }),
            ...(tipoProceso !== undefined && {
                tipoProceso,
            }),
            ...(data.kilosIngresados !== undefined && {
                kilosIngresados: kilosIngresadosFinal,
            }),
            ...(data.kilosResultantes !== undefined && {
                kilosResultantes: Number(data.kilosResultantes),
            }),
            ...(data.codigo !== undefined && {
                codigo: data.codigo.trim(),
            }),
            ...(duracionHoras !== undefined && {
                duracionHoras,
            }),
            ...(fechaInicio !== undefined && {
                fechaInicio,
            }),
            ...(fechaFin !== undefined && {
                fechaFin,
            }),
        },
        /*
         * La edición debe devolver las mismas relaciones que creación
         * y listado para que la tabla no pierda el lote o la cosecha.
         */
        include: procesoInclude,
    });
}
async function eliminarProceso(id) {
    return prisma_1.prisma.procesoTrazabilidad.delete({
        where: {
            id,
        },
    });
}
async function obtenerResumenTrazabilidad(filtros = {}) {
    const procesos = await prisma_1.prisma.procesoTrazabilidad.findMany({
        where: {
            ...(filtros.desde || filtros.hasta
                ? {
                    fecha: {
                        ...(filtros.desde && {
                            gte: filtros.desde,
                        }),
                        ...(filtros.hasta && {
                            lt: filtros.hasta,
                        }),
                    },
                }
                : {}),
        },
        select: {
            kilosIngresados: true,
            kilosResultantes: true,
        },
    });
    const totalIngresado = procesos.reduce((total, proceso) => total + Number(proceso.kilosIngresados), 0);
    /*
     * Los procesos históricos sin kilosResultantes no participan en
     * el total resultante ni en el cálculo de merma.
     */
    const procesosConResultado = procesos.filter((proceso) => proceso.kilosResultantes !== null);
    const totalIngresadoConResultado = procesosConResultado.reduce((total, proceso) => total + Number(proceso.kilosIngresados), 0);
    const totalResultante = procesosConResultado.reduce((total, proceso) => total + Number(proceso.kilosResultantes), 0);
    /*
     * La merma se calcula, pero no se almacena en ProcesoTrazabilidad.
     * Se utiliza una merma global ponderada según los kilos procesados.
     */
    const mermaPromedio = totalIngresadoConResultado > 0
        ? ((totalIngresadoConResultado -
            totalResultante) /
            totalIngresadoConResultado) * 100
        : 0;
    return {
        totalProcesos: procesos.length,
        totalIngresado,
        totalResultante,
        mermaPromedio,
    };
}
//# sourceMappingURL=trazabilidad.service.js.map