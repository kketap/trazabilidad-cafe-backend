"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/lotes/lotes.routes.ts
const express_1 = require("express");
const lotes_controller_1 = require("./lotes.controller");
const router = (0, express_1.Router)();
// Lista lotes productivos.
router.get("/", lotes_controller_1.getLotes);
// Genera código principal: CONV-001 o ESC-001.
router.get("/codigo/siguiente", lotes_controller_1.getSiguienteCodigoPrincipal);
// Genera sublote: ESC-001 -> ESC-001-1.
router.get("/correlativo/:codigoBase", lotes_controller_1.getSiguienteCorrelativo);
// Crea lote.
router.post("/", lotes_controller_1.createLote);
// Actualiza lote.
router.put("/:id", lotes_controller_1.updateLote);
// Elimina o desactiva lote.
router.delete("/:id", lotes_controller_1.deleteLote);
exports.default = router;
//# sourceMappingURL=lotes.routes.js.map