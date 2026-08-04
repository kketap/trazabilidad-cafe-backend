// src/modules/clientes/clientes.routes.ts
import { Router } from "express";
import {
  getClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
  getClientesActivos
} from "./clientes.controller";

const router = Router();

router.get("/", getClientes);
router.get("/activos", getClientesActivos,);
router.get("/:id", getClienteById);
router.post("/", createCliente);
router.put("/:id", updateCliente);
router.delete("/:id", deleteCliente);

export default router;
