"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/auth/auth.routes.ts
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const verifyToken_1 = require("../../middlewares/verifyToken");
const router = (0, express_1.Router)();
router.post("/login", auth_controller_1.loginController);
router.put("/perfil", verifyToken_1.verifyToken, auth_controller_1.actualizarPerfilController);
router.put("/password", verifyToken_1.verifyToken, auth_controller_1.cambiarPasswordController);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map