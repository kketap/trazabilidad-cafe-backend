import { Router } from "express";
import {
    createLote,
    deleteLote,
    getLotes,
    updateLote,
} from "./lotes.controller";

const router = Router();

router.get("/", getLotes);
router.post("/", createLote);
router.put("/:id", updateLote);
router.delete("/:id", deleteLote);

export default router;