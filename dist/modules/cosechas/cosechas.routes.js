"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/cosechas/cosechas.routes.ts
const express_1 = require("express");
const cosechas_controller_1 = require("./cosechas.controller");
const router = (0, express_1.Router)();
router.get("/", cosechas_controller_1.getCosechas);
router.get("/resumen", cosechas_controller_1.getCosechasResumen);
router.get("/analiticas/top-aportantes", cosechas_controller_1.getTopAportantes);
router.post("/analiticas/comparar-secciones", cosechas_controller_1.postCompararSecciones);
router.post("/", cosechas_controller_1.createCosecha);
router.put("/:id", cosechas_controller_1.updateCosecha);
router.delete("/:id", cosechas_controller_1.deleteCosecha);
exports.default = router;
//# sourceMappingURL=cosechas.routes.js.map