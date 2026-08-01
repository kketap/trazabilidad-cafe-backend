"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmpaques = getEmpaques;
exports.getEmpaqueById = getEmpaqueById;
exports.createEmpaque = createEmpaque;
exports.updateEmpaque = updateEmpaque;
exports.deleteEmpaque = deleteEmpaque;
const empaque_service_1 = require("./empaque.service");
async function getEmpaques(_req, res) {
    try {
        const empaques = await (0, empaque_service_1.listarEmpaques)();
        res.json({ ok: true, data: empaques });
    }
    catch (error) {
        console.error("Error listando procesos de empaque:", error);
        res.status(500).json({ ok: false, message: "Error listando procesos de empaque" });
    }
}
async function getEmpaqueById(req, res) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, message: "ID de empaque inválido" });
            return;
        }
        const empaque = await (0, empaque_service_1.obtenerEmpaquePorId)(id);
        if (!empaque) {
            res.status(404).json({ ok: false, message: "Proceso de empaque no encontrado" });
            return;
        }
        res.json({ ok: true, data: empaque });
    }
    catch (error) {
        console.error("Error obteniendo proceso de empaque:", error);
        res.status(500).json({ ok: false, message: "Error obteniendo proceso de empaque" });
    }
}
async function createEmpaque(req, res) {
    try {
        const { loteId, fechaInicio, kilosIngresados, kilosResultantes } = req.body;
        if (!loteId || !fechaInicio || kilosIngresados === undefined || kilosResultantes === undefined) {
            res.status(400).json({
                ok: false,
                message: "Los campos 'loteId', 'fechaInicio', 'kilosIngresados' y 'kilosResultantes' son obligatorios",
            });
            return;
        }
        const empaque = await (0, empaque_service_1.crearEmpaque)(req.body);
        res.status(201).json({ ok: true, data: empaque });
    }
    catch (error) {
        console.error("Error creando proceso de empaque:", error);
        res.status(400).json({ ok: false, message: error.message || "Error creando proceso de empaque" });
    }
}
async function updateEmpaque(req, res) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, message: "ID de empaque inválido" });
            return;
        }
        const empaque = await (0, empaque_service_1.actualizarEmpaque)(id, req.body);
        res.json({ ok: true, data: empaque });
    }
    catch (error) {
        console.error("Error actualizando proceso de empaque:", error);
        res.status(400).json({ ok: false, message: error.message || "Error actualizando proceso de empaque" });
    }
}
async function deleteEmpaque(req, res) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, message: "ID de empaque inválido" });
            return;
        }
        await (0, empaque_service_1.eliminarEmpaque)(id);
        res.json({ ok: true, message: "Proceso de empaque eliminado correctamente" });
    }
    catch (error) {
        console.error("Error eliminando proceso de empaque:", error);
        res.status(400).json({ ok: false, message: error.message || "Error eliminando proceso de empaque" });
    }
}
//# sourceMappingURL=empaque.controller.js.map