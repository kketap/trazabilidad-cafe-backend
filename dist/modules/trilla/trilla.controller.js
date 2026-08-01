"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrdenesTrilla = getOrdenesTrilla;
exports.getOrdenTrillaPorId = getOrdenTrillaPorId;
exports.createOrdenTrillaController = createOrdenTrillaController;
exports.updateOrdenTrillaController = updateOrdenTrillaController;
exports.deleteOrdenTrillaController = deleteOrdenTrillaController;
const trilla_service_1 = require("./trilla.service");
async function getOrdenesTrilla(_req, res) {
    try {
        const ordenes = await (0, trilla_service_1.listarOrdenesTrilla)();
        res.json({ ok: true, data: ordenes });
    }
    catch (error) {
        console.error("Error listando órdenes de trilla:", error);
        res.status(500).json({ ok: false, message: "Error listando órdenes de trilla" });
    }
}
async function getOrdenTrillaPorId(req, res) {
    try {
        const id = String(req.params.id || "");
        if (!id) {
            res.status(400).json({ ok: false, message: "ID requerido" });
            return;
        }
        const orden = await (0, trilla_service_1.obtenerOrdenTrillaPorId)(id);
        if (!orden) {
            res.status(404).json({ ok: false, message: "Orden de trilla no encontrada" });
            return;
        }
        res.json({ ok: true, data: orden });
    }
    catch (error) {
        console.error("Error obteniendo orden de trilla:", error);
        res.status(500).json({ ok: false, message: "Error obteniendo orden de trilla" });
    }
}
async function createOrdenTrillaController(req, res) {
    try {
        const { loteIds, kilosEnviados } = req.body;
        if (!Array.isArray(loteIds) || loteIds.length === 0) {
            res.status(400).json({ ok: false, message: "Debe seleccionar al menos un lote (loteIds)" });
            return;
        }
        if (kilosEnviados === undefined || kilosEnviados === null || isNaN(Number(kilosEnviados))) {
            res.status(400).json({ ok: false, message: "El campo 'kilosEnviados' es obligatorio y debe ser numérico" });
            return;
        }
        const orden = await (0, trilla_service_1.crearOrdenTrilla)(req.body);
        res.status(201).json({ ok: true, data: orden });
    }
    catch (error) {
        console.error("Error creando orden de trilla:", error);
        if (error.code === "P2002") {
            res.status(400).json({ ok: false, message: "El código de trilla ya existe" });
            return;
        }
        res.status(400).json({ ok: false, message: error.message || "Error creando orden de trilla" });
    }
}
async function updateOrdenTrillaController(req, res) {
    try {
        const id = String(req.params.id || "");
        if (!id) {
            res.status(400).json({ ok: false, message: "ID requerido" });
            return;
        }
        const orden = await (0, trilla_service_1.actualizarOrdenTrilla)(id, req.body);
        res.json({ ok: true, data: orden });
    }
    catch (error) {
        console.error("Error actualizando orden de trilla:", error);
        if (error.code === "P2002") {
            res.status(400).json({ ok: false, message: "El código de trilla ya existe" });
            return;
        }
        res.status(400).json({ ok: false, message: error.message || "Error actualizando orden de trilla" });
    }
}
async function deleteOrdenTrillaController(req, res) {
    try {
        const id = String(req.params.id || "");
        if (!id) {
            res.status(400).json({ ok: false, message: "ID requerido" });
            return;
        }
        await (0, trilla_service_1.eliminarOrdenTrilla)(id);
        res.json({ ok: true, message: "Orden de trilla eliminada correctamente" });
    }
    catch (error) {
        console.error("Error eliminando orden de trilla:", error);
        res.status(400).json({ ok: false, message: error.message || "Error eliminando orden de trilla" });
    }
}
//# sourceMappingURL=trilla.controller.js.map