"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const secciones_controller_1 = require("./secciones.controller");
const router = (0, express_1.Router)();
router.get("/calculos-generales", secciones_controller_1.getCalculosGenerales);
router.get("/", secciones_controller_1.getSecciones);
router.get("/:id", secciones_controller_1.getSeccion);
router.post("/", secciones_controller_1.createSeccion);
router.put("/:id", secciones_controller_1.updateSeccion);
router.delete("/:id", secciones_controller_1.deleteSeccion);
exports.default = router;
//# sourceMappingURL=secciones.routes.js.map