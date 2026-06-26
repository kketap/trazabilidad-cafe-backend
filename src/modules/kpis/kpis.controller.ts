// src/modules/kpis/kpis.controller.ts
import type { Request, Response } from "express";
import { obtenerKpisCosechas, obtenerKpisTrazabilidad } from "./kpis.service";

export async function getKpisCosechas(_req: Request, res: Response) {
    try {
        const resultado = await obtenerKpisCosechas();
        res.json(resultado);
    } catch (error) {
        console.error("Error obteniendo KPIs de cosechas:", error);
        res.status(500).json({ message: "Error obteniendo KPIs de cosechas" });
    }
}

export async function getKpisTrazabilidad(_req: Request, res: Response) {
    try {
        const resultado = await obtenerKpisTrazabilidad();
        res.json(resultado);
    } catch (error) {
        console.error("Error obteniendo KPIs de trazabilidad:", error);
        res.status(500).json({ message: "Error obteniendo KPIs de trazabilidad" });
    }
}
