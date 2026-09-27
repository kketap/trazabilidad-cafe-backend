// src/modules/secado/secado.controller.ts
import type { Request, Response } from "express";
import {
    crearSecado,
    listarSecados,
    obtenerSecadoPorId,
    actualizarSecado,
    eliminarSecado,
} from "./secado.service";

export async function getSecados(_req: Request, res: Response) {
    try {
        const secados = await listarSecados();
        res.json({ ok: true, data: secados });
    } catch (error: any) {
        console.error("Error listando procesos de secado:", error);
        res.status(500).json({ ok: false, message: "Error listando procesos de secado" });
    }
}

export async function getSecadoById(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, message: "ID de secado inválido" });
            return;
        }

        const secado = await obtenerSecadoPorId(id);
        if (!secado) {
            res.status(404).json({ ok: false, message: "Proceso de secado no encontrado" });
            return;
        }

        res.json({ ok: true, data: secado });
    } catch (error: any) {
        console.error("Error obteniendo proceso de secado:", error);
        res.status(500).json({ ok: false, message: "Error obteniendo proceso de secado" });
    }
}

export async function createSecado(req: Request, res: Response) {
    try {
        const {
            loteId,
            fechaInicio,
            fechaFin,
            kilosIngresados,
            kilosResultantes,
            observaciones,
            perfilProceso,
            secadora,
            tempMinima,
            tempMaxima,
        } = req.body;

        if (
            !loteId ||
            !fechaInicio ||
            kilosIngresados === undefined ||
            kilosResultantes === undefined
        ) {
            res.status(400).json({
                ok: false,
                message:
                    "Los campos 'loteId', 'fechaInicio', 'kilosIngresados' y 'kilosResultantes' son obligatorios",
            });
            return;
        }

        const secado = await crearSecado({
            loteId: Number(loteId),
            fechaInicio: String(fechaInicio),
            fechaFin: fechaFin ? String(fechaFin) : null,
            kilosIngresados: Number(kilosIngresados),
            kilosResultantes: Number(kilosResultantes),
            observaciones: observaciones || null,
            perfilProceso: perfilProceso || null,
            secadora:
                secadora !== undefined && secadora !== null
                    ? String(secadora)
                    : null,
            tempMinima:
                tempMinima !== undefined && tempMinima !== null
                    ? Number(tempMinima)
                    : null,
            tempMaxima:
                tempMaxima !== undefined && tempMaxima !== null
                    ? Number(tempMaxima)
                    : null,
        });

        res.status(201).json({ ok: true, data: secado });
    } catch (error: any) {
        console.error("Error creando proceso de secado:", error);
        res.status(400).json({
            ok: false,
            message: error.message || "Error creando proceso de secado",
        });
    }
}

export async function updateSecado(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, message: "ID de secado inválido" });
            return;
        }

        const {
            loteId,
            fechaInicio,
            fechaFin,
            kilosIngresados,
            kilosResultantes,
            observaciones,
            perfilProceso,
            secadora,
            tempMinima,
            tempMaxima,
        } = req.body;

        const secado = await actualizarSecado(id, {
            ...(loteId !== undefined && { loteId: Number(loteId) }),
            ...(fechaInicio !== undefined && { fechaInicio }),
            ...(fechaFin !== undefined && { fechaFin }),
            ...(kilosIngresados !== undefined && {
                kilosIngresados: Number(kilosIngresados),
            }),
            ...(kilosResultantes !== undefined && {
                kilosResultantes: Number(kilosResultantes),
            }),
            ...(observaciones !== undefined && { observaciones }),
            ...(perfilProceso !== undefined && { perfilProceso }),
            ...(secadora !== undefined && {
                secadora: secadora !== null ? String(secadora) : null,
            }),
            ...(tempMinima !== undefined && {
                tempMinima: tempMinima !== null ? Number(tempMinima) : null,
            }),
            ...(tempMaxima !== undefined && {
                tempMaxima: tempMaxima !== null ? Number(tempMaxima) : null,
            }),
        });

        res.json({ ok: true, data: secado });
    } catch (error: any) {
        console.error("Error actualizando proceso de secado:", error);
        res.status(400).json({
            ok: false,
            message: error.message || "Error actualizando proceso de secado",
        });
    }
}

export async function deleteSecado(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, message: "ID de secado inválido" });
            return;
        }

        await eliminarSecado(id);
        res.json({ ok: true, message: "Proceso de secado eliminado correctamente" });
    } catch (error: any) {
        console.error("Error eliminando proceso de secado:", error);
        res.status(400).json({ ok: false, message: error.message || "Error eliminando proceso de secado" });
    }
}
