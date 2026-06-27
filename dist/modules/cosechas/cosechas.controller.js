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
        res.json(cosechas);
    }
    catch (error) {
        console.error("Error listando cosechas:", error);
        res.status(500).json({ message: "Error listando cosechas" });
    }
}
async function createCosecha(req, res) {
    try {
        const cosecha = await (0, cosechas_service_1.crearCosecha)(req.body);
        res.status(201).json(cosecha);
    }
    catch (error) {
        console.error("Error creando cosecha:", error);
        res.status(400).json({ message: "Error creando cosecha" });
    }
}
async function updateCosecha(req, res) {
    try {
        const id = Number(req.params.id);
        const cosecha = await (0, cosechas_service_1.actualizarCosecha)(id, req.body);
        res.json(cosecha);
    }
    catch (error) {
        console.error("Error actualizando cosecha:", error);
        res.status(400).json({ message: "Error actualizando cosecha" });
    }
}
async function deleteCosecha(req, res) {
    try {
        const id = Number(req.params.id);
        await (0, cosechas_service_1.eliminarCosecha)(id);
        res.json({ message: "Cosecha eliminada correctamente" });
    }
    catch (error) {
        console.error("Error eliminando cosecha:", error);
        res.status(400).json({ message: "Error eliminando cosecha" });
    }
}
async function getCosechasResumen(req, res) {
    try {
        const periodo = req.query.periodo;
        const filtros = periodo === "mes-actual" ? getRangoMesActual() : {};
        const resumen = await (0, cosechas_service_1.obtenerResumenCosechas)(filtros);
        res.json(resumen);
    }
    catch (error) {
        console.error("Error obteniendo resumen de cosechas:", error);
        res.status(500).json({ message: "Error obteniendo resumen de cosechas" });
    }
}
//# sourceMappingURL=cosechas.controller.js.map