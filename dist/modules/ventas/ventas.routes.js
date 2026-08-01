"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/ventas/ventas.routes.ts
const express_1 = require("express");
const ventas_controller_1 = require("./ventas.controller");
const router = (0, express_1.Router)();
router.get("/", ventas_controller_1.getVentas);
router.get("/:id", ventas_controller_1.getVentaById);
router.post("/", ventas_controller_1.createVenta);
router.put("/:id", ventas_controller_1.updateVenta);
router.delete("/:id", ventas_controller_1.deleteVenta);
exports.default = router;
//# sourceMappingURL=ventas.routes.js.map