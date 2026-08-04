// src/modules/auth/auth.routes.ts
import { Router } from "express";
import { loginController, actualizarPerfilController, cambiarPasswordController, logoutController, refreshController } from "./auth.controller";
import { verifyToken } from "../../middlewares/verifyToken";

const router = Router();

router.post("/login", loginController);
router.put("/perfil", verifyToken, actualizarPerfilController);
router.put("/password", verifyToken, cambiarPasswordController);

router.post( "/refresh",refreshController,);

router.post("/logout",logoutController,);

export default router;
