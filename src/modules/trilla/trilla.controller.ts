// src/modules/trilla/trilla.controller.ts
import type { Request, Response } from "express";
import {
  listarOrdenesTrilla,
  obtenerOrdenTrillaPorId,
  crearOrdenTrilla,
  actualizarOrdenTrilla,
  eliminarOrdenTrilla,
} from "./trilla.service";

export async function getOrdenesTrilla(_req: Request, res: Response) {
  try {
    const ordenes = await listarOrdenesTrilla();
    res.json({ ok: true, data: ordenes });
  } catch (error: any) {
    console.error("Error listando órdenes de trilla:", error);
    res.status(500).json({ ok: false, message: "Error listando órdenes de trilla" });
  }
}

export async function getOrdenTrillaPorId(req: Request, res: Response) {
  try {
    const id = String(req.params.id || "");
    if (!id) {
      res.status(400).json({ ok: false, message: "ID requerido" });
      return;
    }

    const orden = await obtenerOrdenTrillaPorId(id);
    if (!orden) {
      res.status(404).json({ ok: false, message: "Orden de trilla no encontrada" });
      return;
    }

    res.json({ ok: true, data: orden });
  } catch (error: any) {
    console.error("Error obteniendo orden de trilla:", error);
    res.status(500).json({ ok: false, message: "Error obteniendo orden de trilla" });
  }
}

export async function createOrdenTrillaController(req: Request, res: Response) {
  try {
    const { loteIds, kilosEnviados } = req.body;

    if (!Array.isArray(loteIds) || loteIds.length === 0) {
      res.status(400).json({ ok: false, message: "Debe seleccionar al menos un lote (loteIds)" });
      return;
    }

    if (kilosEnviados === undefined || kilosEnviados === null || isNaN(Number(kilosEnviados))) {
      res.status(400).json({ ok: false, message: "El campo 'kilosEnviados' es obligatorio y debe ser numérico" });
      return;
    }

    const orden = await crearOrdenTrilla(req.body);
    res.status(201).json({ ok: true, data: orden });
  } catch (error: any) {
    console.error("Error creando orden de trilla:", error);
    if (error.code === "P2002") {
      res.status(400).json({ ok: false, message: "El código de trilla ya existe" });
      return;
    }
    res.status(400).json({ ok: false, message: error.message || "Error creando orden de trilla" });
  }
}

export async function updateOrdenTrillaController(req: Request, res: Response) {
  try {
    const id = String(req.params.id || "");
    if (!id) {
      res.status(400).json({ ok: false, message: "ID requerido" });
      return;
    }

    const orden = await actualizarOrdenTrilla(id, req.body);
    res.json({ ok: true, data: orden });
  } catch (error: any) {
    console.error("Error actualizando orden de trilla:", error);
    if (error.code === "P2002") {
      res.status(400).json({ ok: false, message: "El código de trilla ya existe" });
      return;
    }
    res.status(400).json({ ok: false, message: error.message || "Error actualizando orden de trilla" });
  }
}

export async function deleteOrdenTrillaController(req: Request, res: Response) {
  try {
    const id = String(req.params.id || "");
    if (!id) {
      res.status(400).json({ ok: false, message: "ID requerido" });
      return;
    }

    await eliminarOrdenTrilla(id);
    res.json({ ok: true, message: "Orden de trilla eliminada correctamente" });
  } catch (error: any) {
    console.error("Error eliminando orden de trilla:", error);
    res.status(400).json({ ok: false, message: error.message || "Error eliminando orden de trilla" });
  }
}
