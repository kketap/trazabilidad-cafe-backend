// src/modules/trilla/trilla.routes.ts
import { Router } from "express";
import {
  getOrdenesTrilla,
  getOrdenTrillaPorId,
  createOrdenTrillaController,
  updateOrdenTrillaController,
  deleteOrdenTrillaController,
} from "./trilla.controller";

const router = Router();

router.get("/", getOrdenesTrilla);
router.get("/:id", getOrdenTrillaPorId);
router.post("/", createOrdenTrillaController);
router.put("/:id", updateOrdenTrillaController);
router.patch("/:id", updateOrdenTrillaController);
router.delete("/:id", deleteOrdenTrillaController);

export default router;
