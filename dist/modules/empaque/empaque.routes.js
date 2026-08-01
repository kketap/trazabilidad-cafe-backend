"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/empaque/empaque.routes.ts
const express_1 = require("express");
const empaque_controller_1 = require("./empaque.controller");
const router = (0, express_1.Router)();
router.get("/", empaque_controller_1.getEmpaques);
router.get("/:id", empaque_controller_1.getEmpaqueById);
router.post("/", empaque_controller_1.createEmpaque);
router.put("/:id", empaque_controller_1.updateEmpaque);
router.delete("/:id", empaque_controller_1.deleteEmpaque);
exports.default = router;
//# sourceMappingURL=empaque.routes.js.map