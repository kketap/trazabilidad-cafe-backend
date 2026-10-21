// src/modules/fundos/fundos.routes.ts
import { Router } from "express";
import {
  getFundos,
  updateFundo,
  updateLoteFisico,
} from "./fundos.controller";

const router = Router();

router.get("/", getFundos);
router.put("/:id", updateFundo);
router.put("/lotes-fisicos/:id", updateLoteFisico);

export default router;
