// src/modules/trazabilidad/trazabilidad.controller.ts
import type { Request, Response } from "express";
import {
    crearProceso,
    listarProcesos,
    obtenerResumenTrazabilidad,
    actualizarProceso,
    eliminarProceso,
} from "./trazabilidad.service";

/**
 * Calcula el rango del mes actual.
 * Se usa para /trazabilidad/resumen?periodo=mes-actual
 */
function getRangoMesActual() {
    const now = new Date();

    const desde = new Date(now.getFullYear(), now.getMonth(), 1);
    const hasta = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return { desde, hasta };
}

/**
 * Lista procesos de trazabilidad.
 *
 * Respuesta envuelta en { ok, data } para mantener consistencia
 * con otros módulos del sistema.
 */
export async function getProcesos(_req: Request, res: Response) {
    try {
        const procesos = await listarProcesos();

        res.json({
            ok: true,
            data: procesos,
        });
    } catch (error) {
        console.error("Error listando procesos:", error);

        res.status(500).json({
            ok: false,
            message: "Error listando procesos",
        });
    }
}

/**
 * Crea proceso de trazabilidad.
 *
 * Nuevo flujo:
 * - Se envía lotes[] con los kilos aportados por cada lote.
 *
 * Compatibilidad:
 * - Todavía puede recibir cosechaId para procesos antiguos.
 */
export async function createProceso(req: Request, res: Response) {
    try {
        const {
            fecha,
            fechaInicio,
            fechaFin,
            duracionHoras,
            loteId,
            lotes,
            cosechaId,
            tipoProceso,
            etapa,
            kilosIngresados,
            kilosResultantes,
            gradosBrix,
            nivelPh,
            tempMaxima,
            tempMinima,
            tanqueFermentacion,
            inicioFermentacion,
            finFermentacion,
            fueDespulpado,
            fueLavado,
        } = req.body;

        if (
            !fecha ||
            (lotes === undefined && loteId == null) ||
            kilosIngresados === undefined
        ) {
            res.status(400).json({
                ok: false,
                message:
                    "Los campos 'fecha', 'lotes' (o 'loteId' legado), " +
                    "y 'kilosIngresados' son requeridos",
            });
            return;
        }

        const proceso = await crearProceso({
            fecha: String(fecha),
            ...(fechaInicio !== undefined && { fechaInicio: fechaInicio === null ? null : String(fechaInicio) }),
            ...(fechaFin !== undefined && { fechaFin: fechaFin === null ? null : String(fechaFin) }),
            ...(duracionHoras !== undefined && { duracionHoras: Number(duracionHoras) }),
            ...(lotes !== undefined && { lotes }),
            ...(loteId !== undefined && { loteId: loteId === null ? null : Number(loteId) }),
            ...(cosechaId !== undefined && { cosechaId: cosechaId === null ? null : Number(cosechaId) }),
            ...(tipoProceso !== undefined && { tipoProceso }),
            etapa: etapa == null ? null : String(etapa),
            inicioOxidacion: req.body.inicioOxidacion,
            finOxidacion: req.body.finOxidacion,
            tanqueOxidacion: req.body.tanqueOxidacion,
            kilosIngresados: Number(kilosIngresados),
            kilosResultantes: kilosResultantes == null ? null : Number(kilosResultantes),
            gradosBrix:
                gradosBrix !== undefined && gradosBrix !== null
                    ? Number(gradosBrix)
                    : null,
            nivelPh:
                nivelPh !== undefined && nivelPh !== null
                    ? Number(nivelPh)
                    : null,
            tempMaxima:
                tempMaxima !== undefined && tempMaxima !== null
                    ? Number(tempMaxima)
                    : null,
            tempMinima:
                tempMinima !== undefined && tempMinima !== null
                    ? Number(tempMinima)
                    : null,
            tanqueFermentacion:
                tanqueFermentacion !== undefined && tanqueFermentacion !== null
                    ? String(tanqueFermentacion)
                    : null,
            inicioFermentacion:
                inicioFermentacion !== undefined && inicioFermentacion !== null
                    ? String(inicioFermentacion)
                    : null,
            finFermentacion:
                finFermentacion !== undefined && finFermentacion !== null
                    ? String(finFermentacion)
                    : null,
            fueDespulpado:
                fueDespulpado !== undefined && fueDespulpado !== null
                    ? Boolean(fueDespulpado)
                    : null,
            fueLavado:
                fueLavado !== undefined && fueLavado !== null
                    ? Boolean(fueLavado)
                    : null,
        });

        res.status(201).json({
            ok: true,
            data: proceso,
        });
    } catch (error: any) {
        console.error("Error creando proceso:", error);

        res.status(400).json({
            ok: false,
            message: error.message || "Error creando proceso",
        });
    }
}

/**
 * Obtiene resumen de trazabilidad.
 */
export async function getTrazabilidadResumen(req: Request, res: Response) {
    try {
        const periodo = req.query.periodo;

        const filtros = periodo === "mes-actual" ? getRangoMesActual() : {};

        const resumen = await obtenerResumenTrazabilidad(filtros);

        // Se mantiene respuesta directa porque Home actual espera este formato.
        res.json(resumen);
    } catch (error) {
        console.error("Error obteniendo resumen de trazabilidad:", error);

        res.status(500).json({
            ok: false,
            message: "Error obteniendo resumen de trazabilidad",
        });
    }
}

/**
 * Actualiza proceso de trazabilidad.
 */
export async function updateProceso(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            res.status(400).json({
                ok: false,
                message: "ID de proceso inválido",
            });
            return;
        }

        const proceso = await actualizarProceso(id, {
            ...(req.body.fecha !== undefined && {
                fecha: String(req.body.fecha),
            }),

            ...(req.body.fechaInicio !== undefined && {
                fechaInicio: req.body.fechaInicio === null ? null : String(req.body.fechaInicio),
            }),

            ...(req.body.fechaFin !== undefined && {
                fechaFin: req.body.fechaFin === null ? null : String(req.body.fechaFin),
            }),

            ...(req.body.cosechaId !== undefined && {
                cosechaId: req.body.cosechaId === null ? null : Number(req.body.cosechaId),
            }),

            ...(req.body.tipoProceso !== undefined && {
                tipoProceso: req.body.tipoProceso,
            }),

            ...(req.body.duracionHoras !== undefined && {
                duracionHoras: Number(req.body.duracionHoras),
            }),

            ...(req.body.lotes !== undefined && {
                lotes: req.body.lotes,
            }),

            ...(req.body.loteId !== undefined && {
                loteId:
                    req.body.loteId !== null
                        ? Number(req.body.loteId)
                        : null,
            }),

            inicioOxidacion: req.body.inicioOxidacion,
            finOxidacion: req.body.finOxidacion,
            tanqueOxidacion: req.body.tanqueOxidacion,
            ...(req.body.etapa !== undefined && {
                etapa: String(req.body.etapa),
            }),

            ...(req.body.kilosIngresados !== undefined && {
                kilosIngresados: Number(req.body.kilosIngresados),
            }),

            ...(req.body.kilosResultantes !== undefined && {
                kilosResultantes: Number(req.body.kilosResultantes),
            }),

            ...(req.body.gradosBrix !== undefined && {
                gradosBrix:
                    req.body.gradosBrix !== null
                        ? Number(req.body.gradosBrix)
                        : null,
            }),

            ...(req.body.nivelPh !== undefined && {
                nivelPh:
                    req.body.nivelPh !== null
                        ? Number(req.body.nivelPh)
                        : null,
            }),

            ...(req.body.tempMaxima !== undefined && {
                tempMaxima:
                    req.body.tempMaxima !== null
                        ? Number(req.body.tempMaxima)
                        : null,
            }),

            ...(req.body.tempMinima !== undefined && {
                tempMinima:
                    req.body.tempMinima !== null
                        ? Number(req.body.tempMinima)
                        : null,
            }),

            ...(req.body.tanqueFermentacion !== undefined && {
                tanqueFermentacion:
                    req.body.tanqueFermentacion !== null
                        ? String(req.body.tanqueFermentacion)
                        : null,
            }),

            ...(req.body.inicioFermentacion !== undefined && {
                inicioFermentacion:
                    req.body.inicioFermentacion !== null
                        ? String(req.body.inicioFermentacion)
                        : null,
            }),

            ...(req.body.finFermentacion !== undefined && {
                finFermentacion:
                    req.body.finFermentacion !== null
                        ? String(req.body.finFermentacion)
                        : null,
            }),

            ...(req.body.fueDespulpado !== undefined && {
                fueDespulpado:
                    req.body.fueDespulpado !== null
                        ? Boolean(req.body.fueDespulpado)
                        : null,
            }),

            ...(req.body.fueLavado !== undefined && {
                fueLavado:
                    req.body.fueLavado !== null
                        ? Boolean(req.body.fueLavado)
                        : null,
            }),
        });

        res.json({
            ok: true,
            data: proceso,
        });
    } catch (error: any) {
        console.error("Error actualizando proceso:", error);

        res.status(400).json({
            ok: false,
            message: error.message || "Error actualizando proceso",
        });
    }
}

/**
 * Elimina proceso de trazabilidad.
 */
export async function deleteProceso(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            res.status(400).json({
                ok: false,
                message: "ID de proceso inválido",
            });
            return;
        }

        await eliminarProceso(id);

        res.json({
            ok: true,
            message: "Proceso eliminado correctamente",
        });
    } catch (error: any) {
        console.error("Error eliminando proceso:", error);

        res.status(400).json({
            ok: false,
            message: error.message || "Error eliminando proceso",
        });
    }
}