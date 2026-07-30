"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCosechas = getCosechas;
exports.createCosecha = createCosecha;
exports.updateCosecha = updateCosecha;
exports.deleteCosecha = deleteCosecha;
exports.getCosechasResumen = getCosechasResumen;
const cosechas_service_1 = require("./cosechas.service");
function getRangoMesActual() {
    const now = new Date();
    const desde = new Date(now.getFullYear(), now.getMonth(), 1);
    const hasta = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { desde, hasta };
}
async function getCosechas(_req, res) {
    try {
        const cosechas = await (0, cosechas_service_1.listarCosechas)();
        res.json({ ok: true, data: cosechas });
    }
    catch (error) {
        console.error("Error listando cosechas:", error);
        res.status(500).json({ ok: false, message: "Error listando cosechas" });
    }
}
async function createCosecha(req, res) {
    try {
        const { trabajadorId, kilosCosechados, fecha } = req.body;
        if (!trabajadorId) {
            res.status(400).json({ ok: false, message: "El campo 'trabajadorId' es requerido" });
            return;
        }
        if (!fecha || kilosCosechados === undefined) {
            res.status(400).json({ ok: false, message: "Los campos 'fecha' y 'kilosCosechados' son requeridos" });
            return;
        }
        const cosecha = await (0, cosechas_service_1.crearCosecha)(req.body);
        res.status(201).json({ ok: true, data: cosecha });
    }
    catch (error) {
        console.error("Error creando cosecha:", error);
        res.status(400).json({ ok: false, message: error.message || "Error creando cosecha" });
    }
}
async function updateCosecha(req, res) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, message: "ID de cosecha inválido" });
            return;
        }
        const cosecha = await (0, cosechas_service_1.actualizarCosecha)(id, req.body);
        res.json({ ok: true, data: cosecha });
    }
    catch (error) {
        console.error("Error actualizando cosecha:", error);
        res.status(400).json({ ok: false, message: error.message || "Error actualizando cosecha" });
    }
}
async function deleteCosecha(req, res) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, message: "ID de cosecha inválido" });
            return;
        }
        await (0, cosechas_service_1.eliminarCosecha)(id);
        res.json({ ok: true, message: "Cosecha eliminada correctamente" });
    }
    catch (error) {
        console.error("Error eliminando cosecha:", error);
        res.status(400).json({ ok: false, message: error.message || "Error eliminando cosecha" });
    }
}
async function getCosechasResumen(req, res) {
    try {
        const periodo = req.query.periodo;
        const filtros = periodo === "mes-actual" ? getRangoMesActual() : {};
        const resumen = await (0, cosechas_service_1.obtenerResumenCosechas)(filtros);
        res.json({ ok: true, data: resumen });
    }
    catch (error) {
        console.error("Error obteniendo resumen de cosechas:", error);
        res.status(500).json({ ok: false, message: "Error obteniendo resumen de cosechas" });
    }
}
//# sourceMappingURL=cosechas.controller.js.map