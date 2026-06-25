"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLotes = getLotes;
exports.createLote = createLote;
exports.updateLote = updateLote;
exports.deleteLote = deleteLote;
const lotes_service_1 = require("./lotes.service");
async function getLotes(_req, res) {
    try {
        const lotes = await (0, lotes_service_1.listarLotes)();
        res.json(lotes);
    }
    catch (error) {
        console.error("Error listando lotes:", error);
        res.status(500).json({ message: "Error listando lotes" });
    }
}
async function createLote(req, res) {
    try {
        const lote = await (0, lotes_service_1.crearLote)(req.body);
        res.status(201).json(lote);
    }
    catch (error) {
        console.error("Error creando lote:", error);
        res.status(400).json({ message: "Error creando lote" });
    }
}
async function updateLote(req, res) {
    try {
        const id = Number(req.params.id);
        const lote = await (0, lotes_service_1.actualizarLote)(id, req.body);
        res.json(lote);
    }
    catch (error) {
        console.error("Error actualizando lote:", error);
        res.status(400).json({ message: "Error actualizando lote" });
    }
}
async function deleteLote(req, res) {
    try {
        const id = Number(req.params.id);
        await (0, lotes_service_1.eliminarLote)(id);
        res.json({ message: "Lote eliminado correctamente" });
    }
    catch (error) {
        console.error("Error eliminando lote:", error);
        res.status(400).json({ message: "Error eliminando lote" });
    }
}
//# sourceMappingURL=lotes.controller.js.map