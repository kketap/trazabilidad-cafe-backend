"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/trazabilidad/trazabilidad.routes.ts
const express_1 = require("express");
const trazabilidad_controller_1 = require("./trazabilidad.controller");
const router = (0, express_1.Router)();
router.get("/", trazabilidad_controller_1.getProcesos);
router.get("/resumen", trazabilidad_controller_1.getTrazabilidadResumen);
router.post("/", trazabilidad_controller_1.createProceso);
router.put("/:id", trazabilidad_controller_1.updateProceso);
router.delete("/:id", trazabilidad_controller_1.deleteProceso);
exports.default = router;
//# sourceMappingURL=trazabilidad.routes.js.map