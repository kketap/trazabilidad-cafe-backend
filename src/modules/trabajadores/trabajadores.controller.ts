// src/modules/trabajadores/trabajadores.controller.ts
import type { Request, Response } from "express";
import * as trabajadoresService from "./trabajadores.service";

export async function getTrabajadores(_req: Request, res: Response) {
  try {
    const trabajadores = await trabajadoresService.listarTrabajadores();
    res.json({ ok: true, data: trabajadores });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Error al listar trabajadores" });
  }
}

export async function getTrabajadorById(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ ok: false, message: "ID de trabajador inválido" });
      return;
    }

    const trabajador = await trabajadoresService.obtenerTrabajadorPorId(id);
    if (!trabajador) {
      res.status(404).json({ ok: false, message: "Trabajador no encontrado" });
      return;
    }

    res.json({ ok: true, data: trabajador });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Error al obtener trabajador" });
  }
}

export async function createTrabajador(req: Request, res: Response) {
  try {
    const { nombres, apellidos, dni, codigoInterno, rol, telefono, activo } = req.body;
    if (dni != null && typeof dni !== "string") {
      res.status(400).json({ ok: false, message: "Ingrese el DNI como texto" });
      return;
    }

    if (typeof nombres !== "string" || !nombres.trim()) {
      res.status(400).json({
        ok: false,
        message: "Ingrese el nombre del trabajador",
      });
      return;
    }

    const nuevoTrabajador = await trabajadoresService.crearTrabajador({
      nombres,
      apellidos,
      dni,
      codigoInterno,
      rol,
      telefono,
      activo,
    });
    res.status(201).json({ ok: true, data: nuevoTrabajador });
  } catch (error: any) {
    if (error.code === "P2002") {
      const campo = error.meta?.target?.includes("codigoInterno") ? "código interno" : "DNI";
      res.status(400).json({ ok: false, message: `El ${campo} ingresado ya existe` });
      return;
    }
    res.status(500).json({ ok: false, message: error.message || "Error al crear trabajador" });
  }
}

export async function updateTrabajador(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ ok: false, message: "ID de trabajador inválido" });
      return;
    }

    const { nombres, apellidos, dni, codigoInterno, rol, telefono, activo } = req.body;
    if (dni != null && typeof dni !== "string") {
      res.status(400).json({ ok: false, message: "Ingrese el DNI como texto" });
      return;
    }

    const trabajadorActualizado = await trabajadoresService.actualizarTrabajador(id, {
      nombres,
      apellidos,
      dni,
      codigoInterno,
      rol,
      telefono,
      activo,
    });
    res.json({ ok: true, data: trabajadorActualizado });
  } catch (error: any) {
    if (error.code === "P2002") {
      const campo = error.meta?.target?.includes("codigoInterno") ? "código interno" : "DNI";
      res.status(400).json({ ok: false, message: `El ${campo} ingresado ya existe` });
      return;
    }
    res.status(500).json({ ok: false, message: error.message || "Error al actualizar trabajador" });
  }
}

export async function deleteTrabajador(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ ok: false, message: "ID de trabajador inválido" });
      return;
    }

    await trabajadoresService.eliminarTrabajador(id);
    res.json({ ok: true, message: "Trabajador eliminado correctamente" });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Error al eliminar trabajador" });
  }
}
