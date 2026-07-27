// src/modules/cosechas/cosechas.controller.ts
import type { Request, Response } from "express";
import {
    crearCosecha,
    eliminarCosecha,
    listarCosechas,
    obtenerResumenCosechas,
    actualizarCosecha,
} from "./cosechas.service";

function getRangoMesActual() {
    const now = new Date();

    const desde = new Date(now.getFullYear(), now.getMonth(), 1);
    const hasta = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return { desde, hasta };
}

export async function getCosechas(_req: Request, res: Response) {
    try {
        const cosechas = await listarCosechas();
        res.json({ ok: true, data: cosechas });
    } catch (error: any) {
        console.error("Error listando cosechas:", error);
        res.status(500).json({ ok: false, message: "Error listando cosechas" });
    }
}

export async function createCosecha(req: Request, res: Response) {
    try {
        const { trabajadorId, kilosCosechados, fecha } = req.body;

        if (!trabajadorId) {
            res.status(400).json({ ok: false, message: "El campo 'trabajadorId' es requerido" });
            return;
        }

        if (!fecha || kilosCosechados === undefined) {
            res.status(400).json({ ok: false, message: "Los campos 'fecha' y 'kilosCosechados' son requeridos" });
            return;
        }

        const cosecha = await crearCosecha(req.body);
        res.status(201).json({ ok: true, data: cosecha });
    } catch (error: any) {
        console.error("Error creando cosecha:", error);
        res.status(400).json({ ok: false, message: error.message || "Error creando cosecha" });
    }
}

export async function updateCosecha(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, message: "ID de cosecha inválido" });
            return;
        }

        const cosecha = await actualizarCosecha(id, req.body);
        res.json({ ok: true, data: cosecha });
    } catch (error: any) {
        console.error("Error actualizando cosecha:", error);
        res.status(400).json({ ok: false, message: error.message || "Error actualizando cosecha" });
    }
}

export async function deleteCosecha(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, message: "ID de cosecha inválido" });
            return;
        }

        await eliminarCosecha(id);
        res.json({ ok: true, message: "Cosecha eliminada correctamente" });
    } catch (error: any) {
        console.error("Error eliminando cosecha:", error);
        res.status(400).json({ ok: false, message: error.message || "Error eliminando cosecha" });
    }
}

export async function getCosechasResumen(req: Request, res: Response) {
    try {
        const periodo = req.query.periodo;

        const filtros =
            periodo === "mes-actual" ? getRangoMesActual() : {};

        const resumen = await obtenerResumenCosechas(filtros);

        res.json({ ok: true, data: resumen });
    } catch (error: any) {
        console.error("Error obteniendo resumen de cosechas:", error);
        res.status(500).json({ ok: false, message: "Error obteniendo resumen de cosechas" });
    }
}
