"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/trabajadores/trabajadores.routes.ts
const express_1 = require("express");
const trabajadores_controller_1 = require("./trabajadores.controller");
const router = (0, express_1.Router)();
router.get("/", trabajadores_controller_1.getTrabajadores);
router.get("/:id", trabajadores_controller_1.getTrabajadorById);
router.post("/", trabajadores_controller_1.createTrabajador);
router.put("/:id", trabajadores_controller_1.updateTrabajador);
router.delete("/:id", trabajadores_controller_1.deleteTrabajador);
exports.default = router;
//# sourceMappingURL=trabajadores.routes.js.map