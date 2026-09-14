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
    const {
      loteIds,
      kilosEnviados,
      codigoTrilla,
      numeroGuia,
      fechaDespacho,
      exportable,
      recuperado,
      malla13,
      segundaBuena,
      segundaMala,
      sucioEscojo,
      cisco,
      descarteMaquina,
      cascarilla,
    } = req.body;

    if (!Array.isArray(loteIds) || loteIds.length === 0) {
      res.status(400).json({ ok: false, message: "Debe seleccionar al menos un lote (loteIds)" });
      return;
    }

    if (kilosEnviados === undefined || kilosEnviados === null || isNaN(Number(kilosEnviados))) {
      res.status(400).json({ ok: false, message: "El campo 'kilosEnviados' es obligatorio y debe ser numérico" });
      return;
    }

    const orden = await crearOrdenTrilla({
      loteIds: loteIds.map((id) => Number(id)),
      kilosEnviados: Number(kilosEnviados),
      codigoTrilla: codigoTrilla ? String(codigoTrilla).trim() : undefined,
      numeroGuia: numeroGuia ? String(numeroGuia).trim() : null,
      fechaDespacho: fechaDespacho ? String(fechaDespacho) : undefined,
      exportable: exportable !== undefined ? (exportable !== null ? Number(exportable) : null) : undefined,
      recuperado: recuperado !== undefined ? (recuperado !== null ? Number(recuperado) : null) : undefined,
      malla13: malla13 !== undefined ? (malla13 !== null ? Number(malla13) : null) : undefined,
      segundaBuena: segundaBuena !== undefined ? (segundaBuena !== null ? Number(segundaBuena) : null) : undefined,
      segundaMala: segundaMala !== undefined ? (segundaMala !== null ? Number(segundaMala) : null) : undefined,
      sucioEscojo: sucioEscojo !== undefined ? (sucioEscojo !== null ? Number(sucioEscojo) : null) : undefined,
      cisco: cisco !== undefined ? (cisco !== null ? Number(cisco) : null) : undefined,
      descarteMaquina: descarteMaquina !== undefined ? (descarteMaquina !== null ? Number(descarteMaquina) : null) : undefined,
      cascarilla: cascarilla !== undefined ? (cascarilla !== null ? Number(cascarilla) : null) : undefined,
    });

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

    const {
      codigoTrilla,
      numeroGuia,
      fechaDespacho,
      fechaIngreso,
      calidad,
      tipoSaco,
      kilosEnviados,
      kilosNetos,
      loteIds,
      exportable,
      recuperado,
      malla13,
      segundaBuena,
      segundaMala,
      sucioEscojo,
      cisco,
      descarteMaquina,
      cascarilla,
    } = req.body;

    const orden = await actualizarOrdenTrilla(id, {
      ...(codigoTrilla !== undefined && { codigoTrilla: String(codigoTrilla).trim() }),
      ...(numeroGuia !== undefined && { numeroGuia: numeroGuia !== null ? String(numeroGuia).trim() : null }),
      ...(fechaDespacho !== undefined && { fechaDespacho: String(fechaDespacho) }),
      ...(fechaIngreso !== undefined && { fechaIngreso: fechaIngreso !== null ? String(fechaIngreso) : null }),
      ...(calidad !== undefined && { calidad: calidad !== null ? String(calidad).trim() : null }),
      ...(tipoSaco !== undefined && { tipoSaco: tipoSaco !== null ? String(tipoSaco).trim() : null }),
      ...(kilosEnviados !== undefined && { kilosEnviados: Number(kilosEnviados) }),
      ...(kilosNetos !== undefined && { kilosNetos: kilosNetos !== null ? Number(kilosNetos) : null }),
      ...(loteIds !== undefined && { loteIds: Array.isArray(loteIds) ? loteIds.map((lId) => Number(lId)) : [] }),
      ...(exportable !== undefined && { exportable: exportable !== null ? Number(exportable) : null }),
      ...(recuperado !== undefined && { recuperado: recuperado !== null ? Number(recuperado) : null }),
      ...(malla13 !== undefined && { malla13: malla13 !== null ? Number(malla13) : null }),
      ...(segundaBuena !== undefined && { segundaBuena: segundaBuena !== null ? Number(segundaBuena) : null }),
      ...(segundaMala !== undefined && { segundaMala: segundaMala !== null ? Number(segundaMala) : null }),
      ...(sucioEscojo !== undefined && { sucioEscojo: sucioEscojo !== null ? Number(sucioEscojo) : null }),
      ...(cisco !== undefined && { cisco: cisco !== null ? Number(cisco) : null }),
      ...(descarteMaquina !== undefined && { descarteMaquina: descarteMaquina !== null ? Number(descarteMaquina) : null }),
      ...(cascarilla !== undefined && { cascarilla: cascarilla !== null ? Number(cascarilla) : null }),
    });

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
