// src/modules/clientes/clientes.controller.ts
import type { Request, Response } from "express";
import * as clientesService from "./clientes.service";

export async function getClientes(_req: Request, res: Response) {
  try {
    const clientes = await clientesService.listarClientes();
    res.json({ ok: true, data: clientes });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      message: error.message || "Error al listar clientes",
    });
  }
}

export async function getClienteById(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({
        ok: false,
        message: "ID de cliente inválido",
      });
      return;
    }

    const cliente = await clientesService.obtenerClientePorId(id);

    if (!cliente) {
      res.status(404).json({
        ok: false,
        message: "Cliente no encontrado",
      });
      return;
    }

    res.json({ ok: true, data: cliente });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      message: error.message || "Error al obtener cliente",
    });
  }
}

export async function createCliente(req: Request, res: Response) {
  try {
    const {
      dniRut,
      nombre,
      personaJuridica,
      telefono,
      email,
      direccion,
      activo,
    } = req.body;

    if (!dniRut || !nombre) {
      res.status(400).json({
        ok: false,
        message: "Los campos 'dniRut' y 'nombre' son requeridos",
      });
      return;
    }

    const nuevoCliente = await clientesService.crearCliente({
      dniRut,
      nombre,
      personaJuridica,
      telefono,
      email,
      direccion,
      activo,
    });

    res.status(201).json({ ok: true, data: nuevoCliente });
  } catch (error: any) {
    if (error.code === "P2002") {
      res.status(400).json({
        ok: false,
        message: "El DNI/RUT ingresado ya existe",
      });
      return;
    }

    res.status(500).json({
      ok: false,
      message: error.message || "Error al crear cliente",
    });
  }
}

export async function updateCliente(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({
        ok: false,
        message: "ID de cliente inválido",
      });
      return;
    }

    const {
      dniRut,
      nombre,
      personaJuridica,
      telefono,
      email,
      direccion,
      activo,
    } = req.body;

    const clienteActualizado = await clientesService.actualizarCliente(id, {
      dniRut,
      nombre,
      personaJuridica,
      telefono,
      email,
      direccion,
      activo,
    });

    res.json({ ok: true, data: clienteActualizado });
  } catch (error: any) {
    if (error.code === "P2002") {
      res.status(400).json({
        ok: false,
        message: "El DNI/RUT ingresado ya existe",
      });
      return;
    }

    res.status(500).json({
      ok: false,
      message: error.message || "Error al actualizar cliente",
    });
  }
}

export async function deleteCliente(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({
        ok: false,
        message: "ID de cliente inválido",
      });
      return;
    }

    await clientesService.eliminarCliente(id);

    res.json({
      ok: true,
      message: "Cliente desactivado correctamente",
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      message: error.message || "Error al eliminar cliente",
    });
  }
}