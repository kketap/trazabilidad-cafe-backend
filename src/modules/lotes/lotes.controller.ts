// src/modules/lotes/lotes.controller.ts
import type { Request, Response } from "express";
import {
  actualizarLote,
  crearLote,
  eliminarLote,
  listarLotes,
  generarSiguienteCorrelativoLote,
} from "./lotes.service";

export async function getLotes(_req: Request, res: Response) {
  try {
    const lotes = await listarLotes();
    res.json({ ok: true, data: lotes });
  } catch (error: any) {
    console.error("Error listando lotes:", error);
    res.status(500).json({ ok: false, message: "Error listando lotes" });
  }
}

export async function getSiguienteCorrelativo(req: Request, res: Response) {
  try {
    const codigoBase = String(req.params.codigoBase || "");
    if (!codigoBase) {
      res.status(400).json({ ok: false, message: "Código base requerido" });
      return;
    }

    const nuevoCodigo = await generarSiguienteCorrelativoLote(codigoBase);
    res.json({ ok: true, data: { codigo: nuevoCodigo } });
  } catch (error: any) {
    console.error("Error generando correlativo de lote:", error);
    res.status(500).json({ ok: false, message: "Error generando correlativo de lote" });
  }
}

export async function createLote(req: Request, res: Response) {
  try {
    const { codigo } = req.body;
    if (!codigo) {
      res.status(400).json({ ok: false, message: "El campo 'codigo' es obligatorio" });
      return;
    }

    const lote = await crearLote(req.body);
    res.status(201).json({ ok: true, data: lote });
  } catch (error: any) {
    console.error("Error creando lote:", error);
    if (error.code === "P2002") {
      res.status(400).json({ ok: false, message: "El código de lote ya existe" });
      return;
    }
    res.status(400).json({ ok: false, message: error.message || "Error creando lote" });
  }
}

export async function updateLote(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ ok: false, message: "ID de lote inválido" });
      return;
    }

    const lote = await actualizarLote(id, req.body);
    res.json({ ok: true, data: lote });
  } catch (error: any) {
    console.error("Error actualizando lote:", error);
    if (error.code === "P2002") {
      res.status(400).json({ ok: false, message: "El código de lote ya existe" });
      return;
    }
    res.status(400).json({ ok: false, message: error.message || "Error actualizando lote" });
  }
}

export async function deleteLote(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ ok: false, message: "ID de lote inválido" });
      return;
    }

    await eliminarLote(id);
    res.json({ ok: true, message: "Lote eliminado correctamente" });
  } catch (error: any) {
    console.error("Error eliminando lote:", error);
    res.status(400).json({ ok: false, message: error.message || "Error eliminando lote" });
  }
}