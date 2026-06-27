"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKpisCosechas = getKpisCosechas;
exports.getKpisTrazabilidad = getKpisTrazabilidad;
const kpis_service_1 = require("./kpis.service");
async function getKpisCosechas(_req, res) {
    try {
        const resultado = await (0, kpis_service_1.obtenerKpisCosechas)();
        res.json(resultado);
    }
    catch (error) {
        console.error("Error obteniendo KPIs de cosechas:", error);
        res.status(500).json({ message: "Error obteniendo KPIs de cosechas" });
    }
}
async function getKpisTrazabilidad(_req, res) {
    try {
        const resultado = await (0, kpis_service_1.obtenerKpisTrazabilidad)();
        res.json(resultado);
    }
    catch (error) {
        console.error("Error obteniendo KPIs de trazabilidad:", error);
        res.status(500).json({ message: "Error obteniendo KPIs de trazabilidad" });
    }
}
//# sourceMappingURL=kpis.controller.js.map