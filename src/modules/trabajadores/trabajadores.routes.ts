// src/modules/trabajadores/trabajadores.routes.ts
import { Router } from "express";
import {
  getTrabajadores,
  getTrabajadorById,
  createTrabajador,
  updateTrabajador,
  deleteTrabajador,
} from "./trabajadores.controller";

const router = Router();

router.get("/", getTrabajadores);
router.get("/:id", getTrabajadorById);
router.post("/", createTrabajador);
router.put("/:id", updateTrabajador);
router.delete("/:id", deleteTrabajador);

export default router;
