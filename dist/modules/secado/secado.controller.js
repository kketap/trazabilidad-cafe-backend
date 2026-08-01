"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecados = getSecados;
exports.getSecadoById = getSecadoById;
exports.createSecado = createSecado;
exports.updateSecado = updateSecado;
exports.deleteSecado = deleteSecado;
const secado_service_1 = require("./secado.service");
async function getSecados(_req, res) {
    try {
        const secados = await (0, secado_service_1.listarSecados)();
        res.json({ ok: true, data: secados });
    }
    catch (error) {
        console.error("Error listando procesos de secado:", error);
        res.status(500).json({ ok: false, message: "Error listando procesos de secado" });
    }
}
async function getSecadoById(req, res) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, message: "ID de secado inválido" });
            return;
        }
        const secado = await (0, secado_service_1.obtenerSecadoPorId)(id);
        if (!secado) {
            res.status(404).json({ ok: false, message: "Proceso de secado no encontrado" });
            return;
        }
        res.json({ ok: true, data: secado });
    }
    catch (error) {
        console.error("Error obteniendo proceso de secado:", error);
        res.status(500).json({ ok: false, message: "Error obteniendo proceso de secado" });
    }
}
async function createSecado(req, res) {
    try {
        const { loteId, fechaInicio, kilosIngresados, kilosResultantes } = req.body;
        if (!loteId || !fechaInicio || kilosIngresados === undefined || kilosResultantes === undefined) {
            res.status(400).json({
                ok: false,
                message: "Los campos 'loteId', 'fechaInicio', 'kilosIngresados' y 'kilosResultantes' son obligatorios",
            });
            return;
        }
        const secado = await (0, secado_service_1.crearSecado)(req.body);
        res.status(201).json({ ok: true, data: secado });
    }
    catch (error) {
        console.error("Error creando proceso de secado:", error);
        res.status(400).json({ ok: false, message: error.message || "Error creando proceso de secado" });
    }
}
async function updateSecado(req, res) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, message: "ID de secado inválido" });
            return;
        }
        const secado = await (0, secado_service_1.actualizarSecado)(id, req.body);
        res.json({ ok: true, data: secado });
    }
    catch (error) {
        console.error("Error actualizando proceso de secado:", error);
        res.status(400).json({ ok: false, message: error.message || "Error actualizando proceso de secado" });
    }
}
async function deleteSecado(req, res) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, message: "ID de secado inválido" });
            return;
        }
        await (0, secado_service_1.eliminarSecado)(id);
        res.json({ ok: true, message: "Proceso de secado eliminado correctamente" });
    }
    catch (error) {
        console.error("Error eliminando proceso de secado:", error);
        res.status(400).json({ ok: false, message: error.message || "Error eliminando proceso de secado" });
    }
}
//# sourceMappingURL=secado.controller.js.map