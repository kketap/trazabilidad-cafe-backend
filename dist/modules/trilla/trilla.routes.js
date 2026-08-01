"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/trilla/trilla.routes.ts
const express_1 = require("express");
const trilla_controller_1 = require("./trilla.controller");
const router = (0, express_1.Router)();
router.get("/", trilla_controller_1.getOrdenesTrilla);
router.get("/:id", trilla_controller_1.getOrdenTrillaPorId);
router.post("/", trilla_controller_1.createOrdenTrillaController);
router.put("/:id", trilla_controller_1.updateOrdenTrillaController);
router.patch("/:id", trilla_controller_1.updateOrdenTrillaController);
router.delete("/:id", trilla_controller_1.deleteOrdenTrillaController);
exports.default = router;
//# sourceMappingURL=trilla.routes.js.map