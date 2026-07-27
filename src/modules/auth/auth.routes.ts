// src/modules/auth/auth.routes.ts
import { Router } from "express";
import { loginController, actualizarPerfilController, cambiarPasswordController } from "./auth.controller";
import { verifyToken } from "../../middlewares/verifyToken";

const router = Router();

router.post("/login", loginController);
router.put("/perfil", verifyToken, actualizarPerfilController);
router.put("/password", verifyToken, cambiarPasswordController);

export default router;
