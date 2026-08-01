"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/secado/secado.routes.ts
const express_1 = require("express");
const secado_controller_1 = require("./secado.controller");
const router = (0, express_1.Router)();
router.get("/", secado_controller_1.getSecados);
router.get("/:id", secado_controller_1.getSecadoById);
router.post("/", secado_controller_1.createSecado);
router.put("/:id", secado_controller_1.updateSecado);
router.delete("/:id", secado_controller_1.deleteSecado);
exports.default = router;
//# sourceMappingURL=secado.routes.js.map