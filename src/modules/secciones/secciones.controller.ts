import type { Request, Response } from "express";
import {
    listarSecciones,
    crearSeccion,
    obtenerSeccion,
    actualizarSeccion,
    eliminarSeccion,
    obtenerCalculosGenerales,
} from "./secciones.service";

export async function getSecciones(_req: Request, res: Response) {
    try {
        const secciones = await listarSecciones();
        res.json(secciones);
    } catch (error) {
        console.error("Error listando secciones:", error);
        res.status(500).json({ message: "Error listando secciones" });
    }
}

export async function getSeccion(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        const seccion = await obtenerSeccion(id);

        if (!seccion) {
            res.status(404).json({ message: "Sección no encontrada" });
            return;
        }

        res.json(seccion);
    } catch (error) {
        console.error("Error obteniendo sección:", error);
        res.status(500).json({ message: "Error obteniendo sección" });
    }
}

export async function createSeccion(req: Request, res: Response) {
    try {
        const seccion = await crearSeccion(req.body);
        res.status(201).json(seccion);
    } catch (error) {
        console.error("Error creando sección:", error);
        res.status(400).json({ message: "Error creando sección" });
    }
}

export async function updateSeccion(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        const seccion = await actualizarSeccion(id, req.body);
        res.json(seccion);
    } catch (error) {
        console.error("Error actualizando sección:", error);
        res.status(400).json({ message: "Error actualizando sección" });
    }
}

export async function deleteSeccion(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        await eliminarSeccion(id);
        res.json({ message: "Sección eliminada correctamente" });
    } catch (error) {
        console.error("Error eliminando sección:", error);
        res.status(400).json({ message: "Error eliminando sección" });
    }
}

export async function getCalculosGenerales(_req: Request, res: Response) {
    try {
        const calculos = await obtenerCalculosGenerales();
        res.json(calculos);
    } catch (error) {
        console.error("Error obteniendo cálculos generales:", error);
        res.status(500).json({ message: "Error obteniendo cálculos generales" });
    }
}
