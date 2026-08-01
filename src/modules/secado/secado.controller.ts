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
        const { loteId, fechaInicio, kilosIngresados, kilosResultantes } = req.body;

        if (!loteId || !fechaInicio || kilosIngresados === undefined || kilosResultantes === undefined) {
            res.status(400).json({
                ok: false,
                message: "Los campos 'loteId', 'fechaInicio', 'kilosIngresados' y 'kilosResultantes' son obligatorios",
            });
            return;
        }

        const secado = await crearSecado(req.body);
        res.status(201).json({ ok: true, data: secado });
    } catch (error: any) {
        console.error("Error creando proceso de secado:", error);
        res.status(400).json({ ok: false, message: error.message || "Error creando proceso de secado" });
    }
}

export async function updateSecado(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, message: "ID de secado inválido" });
            return;
        }

        const secado = await actualizarSecado(id, req.body);
        res.json({ ok: true, data: secado });
    } catch (error: any) {
        console.error("Error actualizando proceso de secado:", error);
        res.status(400).json({ ok: false, message: error.message || "Error actualizando proceso de secado" });
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
