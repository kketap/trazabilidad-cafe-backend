// src/modules/ventas/ventas.controller.ts
import type { Request, Response } from "express";
import * as ventasService from "./ventas.service";

export async function getVentas(_req: Request, res: Response) {
  try {
    const ventas = await ventasService.listarVentas();
    res.json({ ok: true, data: ventas });
  } catch (error: any) {
    console.error("Error listando ventas:", error);
    res.status(500).json({ ok: false, message: error.message || "Error al listar ventas" });
  }
}

export async function getVentaById(req: Request, res: Response) {
  try {
    const id = String(req.params.id || "");
    if (!id) {
      res.status(400).json({ ok: false, message: "ID requerido" });
      return;
    }

    const venta = await ventasService.obtenerVentaPorId(id);
    if (!venta) {
      res.status(404).json({ ok: false, message: "Venta no encontrada" });
      return;
    }

    res.json({ ok: true, data: venta });
  } catch (error: any) {
    console.error("Error obteniendo venta:", error);
    res.status(500).json({ ok: false, message: error.message || "Error al obtener venta" });
  }
}

export async function createVenta(req: Request, res: Response) {
  try {
    const {
      producto,
      kilosVendidos,
      presentacionSacos,
      precioVentaKilo,
      clienteId,
      ordenTrillaId,
    } = req.body;

    if (!producto?.trim()) {
      res.status(400).json({ ok: false, message: "El campo 'producto' es requerido" });
      return;
    }

    if (kilosVendidos === undefined || kilosVendidos === null || isNaN(Number(kilosVendidos))) {
      res.status(400).json({ ok: false, message: "El campo 'kilosVendidos' es obligatorio y debe ser numérico" });
      return;
    }

    if (!presentacionSacos?.trim()) {
      res.status(400).json({ ok: false, message: "El campo 'presentacionSacos' es requerido" });
      return;
    }

    if (precioVentaKilo === undefined || precioVentaKilo === null || isNaN(Number(precioVentaKilo))) {
      res.status(400).json({ ok: false, message: "El campo 'precioVentaKilo' es obligatorio y debe ser numérico" });
      return;
    }

    if (clienteId === undefined || clienteId === null || isNaN(Number(clienteId))) {
      res.status(400).json({ ok: false, message: "El campo 'clienteId' es obligatorio y debe ser numérico" });
      return;
    }

    if (!ordenTrillaId?.trim()) {
      res.status(400).json({ ok: false, message: "El campo 'ordenTrillaId' es requerido" });
      return;
    }

    const venta = await ventasService.crearVenta(req.body);
    res.status(201).json({ ok: true, data: venta });
  } catch (error: any) {
    console.error("Error creando venta:", error);
    res.status(400).json({ ok: false, message: error.message || "Error al crear venta" });
  }
}

export async function updateVenta(req: Request, res: Response) {
  try {
    const id = String(req.params.id || "");
    if (!id) {
      res.status(400).json({ ok: false, message: "ID requerido" });
      return;
    }

    const venta = await ventasService.actualizarVenta(id, req.body);
    res.json({ ok: true, data: venta });
  } catch (error: any) {
    console.error("Error actualizando venta:", error);
    res.status(400).json({ ok: false, message: error.message || "Error al actualizar venta" });
  }
}

export async function deleteVenta(req: Request, res: Response) {
  try {
    const id = String(req.params.id || "");
    if (!id) {
      res.status(400).json({ ok: false, message: "ID requerido" });
      return;
    }

    await ventasService.eliminarVenta(id);
    res.json({ ok: true, message: "Venta eliminada correctamente" });
  } catch (error: any) {
    console.error("Error eliminando venta:", error);
    res.status(400).json({ ok: false, message: error.message || "Error al eliminar venta" });
  }
}
