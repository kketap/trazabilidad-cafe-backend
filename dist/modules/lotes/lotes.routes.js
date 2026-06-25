"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lotes_controller_1 = require("./lotes.controller");
const router = (0, express_1.Router)();
router.get("/", lotes_controller_1.getLotes);
router.post("/", lotes_controller_1.createLote);
router.put("/:id", lotes_controller_1.updateLote);
router.delete("/:id", lotes_controller_1.deleteLote);
exports.default = router;
//# sourceMappingURL=lotes.routes.js.map