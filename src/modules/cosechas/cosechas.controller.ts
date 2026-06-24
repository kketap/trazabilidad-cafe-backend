//src/modules/cosechas/cosechas.controller.ts
import type { Request, Response } from "express";
import {
    crearCosecha,
    eliminarCosecha,
    listarCosechas,
    obtenerResumenCosechas,
    actualizarCosecha,
} from "./cosechas.service";

export async function getCosechas(_req: Request, res: Response) {
    try {
        const cosechas = await listarCosechas();
        res.json(cosechas);
    } catch (error) {
        console.error("Error listando cosechas:", error);
        res.status(500).json({ message: "Error listando cosechas" });
    }
}

export async function createCosecha(req: Request, res: Response) {
    try {
        const cosecha = await crearCosecha(req.body);
        res.status(201).json(cosecha);
    } catch (error) {
        console.error("Error creando cosecha:", error);
        res.status(400).json({ message: "Error creando cosecha" });
    }
}

export async function updateCosecha(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        const cosecha = await actualizarCosecha(id, req.body);
        res.json(cosecha);
    } catch (error) {
        console.error("Error actualizando cosecha:", error);
        res.status(400).json({ message: "Error actualizando cosecha" });
    }
}

export async function deleteCosecha(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        await eliminarCosecha(id);
        res.json({ message: "Cosecha eliminada correctamente" });
    } catch (error) {
        console.error("Error eliminando cosecha:", error);
        res.status(400).json({ message: "Error eliminando cosecha" });
    }
}

export async function getCosechasResumen(_req: Request, res: Response) {
    try {
        const resumen = await obtenerResumenCosechas();
        res.json(resumen);
    } catch (error) {
        console.error("Error obteniendo resumen de cosechas:", error);
        res.status(500).json({ message: "Error obteniendo resumen de cosechas" });
    }
}