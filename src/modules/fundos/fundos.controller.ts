// src/modules/fundos/fundos.controller.ts
import type { Request, Response } from "express";
import {
  listarFundos,
  actualizarFundo,
  actualizarLoteFisico,
} from "./fundos.service";

export async function getFundos(_req: Request, res: Response) {
  try {
    const fundos = await listarFundos();
    res.json({ ok: true, data: fundos });
  } catch (error: any) {
    console.error("Error listando fundos:", error);
    res.status(500).json({ ok: false, message: "Error listando fundos" });
  }
}

export async function updateFundo(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ ok: false, message: "ID de fundo inválido" });
      return;
    }
    const fundo = await actualizarFundo(id, req.body);
    res.json({ ok: true, data: fundo });
  } catch (error: any) {
    console.error("Error actualizando fundo:", error);
    res.status(400).json({ ok: false, message: error.message || "Error actualizando fundo" });
  }
}

export async function updateLoteFisico(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ ok: false, message: "ID de lote físico inválido" });
      return;
    }
    const loteFisico = await actualizarLoteFisico(id, req.body);
    res.json({ ok: true, data: loteFisico });
  } catch (error: any) {
    console.error("Error actualizando lote físico:", error);
    res.status(400).json({ ok: false, message: error.message || "Error actualizando lote físico" });
  }
}
