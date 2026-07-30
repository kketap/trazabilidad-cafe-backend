"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/kpis/kpis.routes.ts
const express_1 = require("express");
const kpis_controller_1 = require("./kpis.controller");
const router = (0, express_1.Router)();
router.get("/cosechas", kpis_controller_1.getKpisCosechas);
router.get("/trazabilidad", kpis_controller_1.getKpisTrazabilidad);
exports.default = router;
//# sourceMappingURL=kpis.routes.js.map