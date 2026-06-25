"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/index.ts
const express_1 = require("express");
const cosechas_routes_1 = __importDefault(require("../modules/cosechas/cosechas.routes"));
const trazabilidad_routes_1 = __importDefault(require("../modules/trazabilidad/trazabilidad.routes"));
const lotes_routes_1 = __importDefault(require("../modules/lotes/lotes.routes"));
const router = (0, express_1.Router)();
router.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "trazabilidad-cafe-backend",
    });
});
router.use("/cosechas", cosechas_routes_1.default);
router.use("/trazabilidad", trazabilidad_routes_1.default);
router.use("/lotes", lotes_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map