// src/modules/trazabilidad/trazabilidad.controller.ts
import type { Request, Response } from "express";
import {
    crearProceso,
    listarProcesos,
    obtenerResumenTrazabilidad,
} from "./trazabilidad.service";

export async function getProcesos(_req: Request, res: Response) {
    try {
        const procesos = await listarProcesos();
        res.json(procesos);
    } catch (error) {
        console.error("Error listando procesos:", error);
        res.status(500).json({ message: "Error listando procesos" });
    }
}

export async function createProceso(req: Request, res: Response) {
    try {
        const proceso = await crearProceso(req.body);
        res.status(201).json(proceso);
    } catch (error) {
        console.error("Error creando proceso:", error);
        res.status(400).json({ message: "Error creando proceso" });
    }
}

export async function getTrazabilidadResumen(_req: Request, res: Response) {
    try {
        const resumen = await obtenerResumenTrazabilidad();
        res.json(resumen);
    } catch (error) {
        console.error("Error obteniendo resumen de trazabilidad:", error);
        res.status(500).json({ message: "Error obteniendo resumen de trazabilidad" });
    }
}