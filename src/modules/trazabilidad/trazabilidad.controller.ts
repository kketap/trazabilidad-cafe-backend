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
 * - Preferentemente se envía loteId.
 *
 * Compatibilidad:
 * - Todavía puede recibir cosechaId para procesos antiguos.
 */
export async function createProceso(req: Request, res: Response) {
    try {
        const {
            fecha,
            fechaInicio,
            duracionHoras,
            loteId,
            etapa,
            kilosIngresados,
            kilosResultantes,
        } = req.body;

        if (
            !fecha ||
            !fechaInicio ||
            duracionHoras === undefined ||
            !loteId ||
            !etapa ||
            kilosIngresados === undefined ||
            kilosResultantes === undefined
        ) {
            res.status(400).json({
                ok: false,
                message:
                    "Los campos 'fecha', 'fechaInicio', 'duracionHoras', " +
                    "'loteId', 'etapa', 'kilosIngresados' y " +
                    "'kilosResultantes' son requeridos",
            });
            return;
        }

        const proceso = await crearProceso({
            fecha: String(fecha),
            fechaInicio: String(fechaInicio),
            duracionHoras: Number(duracionHoras),
            loteId: Number(loteId),
            etapa: String(etapa),
            kilosIngresados: Number(kilosIngresados),
            kilosResultantes: Number(kilosResultantes),
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

        if (Number.isNaN(id)) {
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
                fechaInicio: String(req.body.fechaInicio),
            }),

            ...(req.body.duracionHoras !== undefined && {
                duracionHoras: Number(req.body.duracionHoras),
            }),

            ...(req.body.loteId !== undefined && {
                loteId:
                    req.body.loteId !== null
                        ? Number(req.body.loteId)
                        : null,
            }),

            ...(req.body.etapa !== undefined && {
                etapa: String(req.body.etapa),
            }),

            ...(req.body.kilosIngresados !== undefined && {
                kilosIngresados: Number(req.body.kilosIngresados),
            }),

            ...(req.body.kilosResultantes !== undefined && {
                kilosResultantes: Number(req.body.kilosResultantes),
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

        if (Number.isNaN(id)) {
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