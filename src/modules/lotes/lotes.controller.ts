import type { Request, Response } from "express";
import {
  actualizarLote,
  crearLote,
  eliminarLote,
  listarLotes,
} from "./lotes.service";

export async function getLotes(_req: Request, res: Response) {
  try {
    const lotes = await listarLotes();
    res.json(lotes);
  } catch (error) {
    console.error("Error listando lotes:", error);
    res.status(500).json({ message: "Error listando lotes" });
  }
}

export async function createLote(req: Request, res: Response) {
  try {
    const lote = await crearLote(req.body);
    res.status(201).json(lote);
  } catch (error) {
    console.error("Error creando lote:", error);
    res.status(400).json({ message: "Error creando lote" });
  }
}

export async function updateLote(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const lote = await actualizarLote(id, req.body);
    res.json(lote);
  } catch (error) {
    console.error("Error actualizando lote:", error);
    res.status(400).json({ message: "Error actualizando lote" });
  }
}

export async function deleteLote(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    await eliminarLote(id);
    res.json({ message: "Lote eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminando lote:", error);
    res.status(400).json({ message: "Error eliminando lote" });
  }
}