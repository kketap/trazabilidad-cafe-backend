// src/modules/empaque/empaque.controller.ts
import type { Request, Response } from "express";
import {
    crearEmpaque,
    listarEmpaques,
    obtenerEmpaquePorId,
    actualizarEmpaque,
    eliminarEmpaque,
} from "./empaque.service";

export async function getEmpaques(_req: Request, res: Response) {
    try {
        const empaques = await listarEmpaques();
        res.json({ ok: true, data: empaques });
    } catch (error: any) {
        console.error("Error listando procesos de empaque:", error);
        res.status(500).json({ ok: false, message: "Error listando procesos de empaque" });
    }
}

export async function getEmpaqueById(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, message: "ID de empaque inválido" });
            return;
        }

        const empaque = await obtenerEmpaquePorId(id);
        if (!empaque) {
            res.status(404).json({ ok: false, message: "Proceso de empaque no encontrado" });
            return;
        }

        res.json({ ok: true, data: empaque });
    } catch (error: any) {
        console.error("Error obteniendo proceso de empaque:", error);
        res.status(500).json({ ok: false, message: "Error obteniendo proceso de empaque" });
    }
}

export async function createEmpaque(req: Request, res: Response) {
    try {
        const { loteId, fechaInicio, kilosIngresados, kilosResultantes } = req.body;

        if (!loteId || !fechaInicio || kilosIngresados === undefined || kilosResultantes === undefined) {
            res.status(400).json({
                ok: false,
                message: "Los campos 'loteId', 'fechaInicio', 'kilosIngresados' y 'kilosResultantes' son obligatorios",
            });
            return;
        }

        const empaque = await crearEmpaque(req.body);
        res.status(201).json({ ok: true, data: empaque });
    } catch (error: any) {
        console.error("Error creando proceso de empaque:", error);
        res.status(400).json({ ok: false, message: error.message || "Error creando proceso de empaque" });
    }
}

export async function updateEmpaque(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, message: "ID de empaque inválido" });
            return;
        }

        const empaque = await actualizarEmpaque(id, req.body);
        res.json({ ok: true, data: empaque });
    } catch (error: any) {
        console.error("Error actualizando proceso de empaque:", error);
        res.status(400).json({ ok: false, message: error.message || "Error actualizando proceso de empaque" });
    }
}

export async function deleteEmpaque(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, message: "ID de empaque inválido" });
            return;
        }

        await eliminarEmpaque(id);
        res.json({ ok: true, message: "Proceso de empaque eliminado correctamente" });
    } catch (error: any) {
        console.error("Error eliminando proceso de empaque:", error);
        res.status(400).json({ ok: false, message: error.message || "Error eliminando proceso de empaque" });
    }
}
