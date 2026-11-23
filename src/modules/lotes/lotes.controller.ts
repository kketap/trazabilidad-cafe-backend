// src/modules/lotes/lotes.controller.ts
import type { Request, Response } from "express";
import type { TipoCodigoLote } from "@prisma/client";
import {
  ErrorValidacionLote,
  actualizarLote,
  crearLote,
  eliminarLote,
  listarLotes,
  generarSiguienteCorrelativoLote,
  generarCodigoPrincipalLote,
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

/**
 * Genera el siguiente código principal:
 * COMERCIAL -> CONV-001
 * ESPECIAL -> ESC-001
 */
export async function getSiguienteCodigoPrincipal(req: Request, res: Response) {
  try {
    const tipoCodigo = String(req.query.tipoCodigo || "COMERCIAL") as TipoCodigoLote;

    if (!["COMERCIAL", "ESPECIAL"].includes(tipoCodigo)) {
      res.status(400).json({
        ok: false,
        message: "tipoCodigo inválido. Use COMERCIAL o ESPECIAL",
      });
      return;
    }

    const nuevoCodigo = await generarCodigoPrincipalLote(tipoCodigo);

    res.json({
      ok: true,
      data: {
        codigo: nuevoCodigo,
      },
    });
  } catch (error: any) {
    console.error("Error generando código principal de lote:", error);
    res.status(500).json({
      ok: false,
      message: "Error generando código principal de lote",
    });
  }
}

/**
 * Genera sublotes o saldos:
 * ESC-001 -> ESC-001-1
 */
export async function getSiguienteCorrelativo(req: Request, res: Response) {
  try {
    const codigoBase = String(req.params.codigoBase || "");

    if (!codigoBase) {
      res.status(400).json({ ok: false, message: "Código base requerido" });
      return;
    }

    const nuevoCodigo = await generarSiguienteCorrelativoLote(codigoBase);

    res.json({
      ok: true,
      data: {
        codigo: nuevoCodigo,
      },
    });
  } catch (error: any) {
    console.error("Error generando correlativo de lote:", error);
    res.status(500).json({
      ok: false,
      message: "Error generando correlativo de lote",
    });
  }
}

export async function createLote(req: Request, res: Response) {
  try {
    const { tipoCodigo, codigo } = req.body;

    if (tipoCodigo === "PERSONALIZADO" && !codigo) {
      res.status(400).json({
        ok: false,
        message: "Debe ingresar un código personalizado para el lote",
      });
      return;
    }

    const lote = await crearLote(req.body);

    res.status(201).json({
      ok: true,
      data: lote,
    });
  } catch (error: any) {
    console.error("Error creando lote:", error);

    if (error.code === "P2002") {
      res.status(400).json({
        ok: false,
        message: "El código de lote ya existe",
      });
      return;
    }

    if (error instanceof ErrorValidacionLote) {
      res.status(400).json({ ok: false, message: error.message });
      return;
    }
    res.status(500).json({ ok: false, message: "No pudimos crear el lote. Intenta nuevamente." });
  }
}

export async function updateLote(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({
        ok: false,
        message: "ID de lote inválido",
      });
      return;
    }

    const lote = await actualizarLote(id, req.body);

    res.json({
      ok: true,
      data: lote,
    });
  } catch (error: any) {
    console.error("Error actualizando lote:", error);

    if (error.code === "P2002") {
      res.status(400).json({
        ok: false,
        message: "El código de lote ya existe",
      });
      return;
    }

    if (error.code === "P2025") {
      res.status(404).json({ ok: false, message: "Este lote ya no está disponible. Actualiza la lista antes de continuar." });
      return;
    }
    res.status(500).json({ ok: false, message: "No pudimos guardar los cambios del lote. Intenta nuevamente." });
  }
}

export async function deleteLote(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({
        ok: false,
        message: "ID de lote inválido",
      });
      return;
    }

    const resultado = await eliminarLote(id);
    res.json({
      ok: true,
      message: resultado === "desactivado"
        ? "Lote desactivado. Se conservaron sus registros asociados."
        : "Lote eliminado correctamente.",
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      res.status(404).json({ ok: false, message: "Lote no encontrado" });
      return;
    }
    if (error.code === "P2003" || /ProcesoLote_loteId_fkey|violates RESTRICT/i.test(error.message ?? "")) {
      console.error("No se pudo eliminar un lote con registros asociados:", error);
      res.status(409).json({ ok: false, message: "Este lote está asociado a otros registros. Actualiza la lista y verifica su historial antes de volver a intentar." });
      return;
    }
    if (error.code === "P2034") {
      res.status(409).json({ ok: false, message: "El lote cambió mientras se procesaba la solicitud. Intenta nuevamente." });
      return;
    }
    console.error("Error eliminando lote:", error);
    res.status(500).json({ ok: false, message: "No pudimos completar la operación. Actualiza la lista de lotes e intenta nuevamente." });
  }
}