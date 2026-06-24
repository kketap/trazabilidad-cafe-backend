"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProcesos = getProcesos;
exports.createProceso = createProceso;
exports.getTrazabilidadResumen = getTrazabilidadResumen;
const trazabilidad_service_1 = require("./trazabilidad.service");
async function getProcesos(_req, res) {
    try {
        const procesos = await (0, trazabilidad_service_1.listarProcesos)();
        res.json(procesos);
    }
    catch (error) {
        console.error("Error listando procesos:", error);
        res.status(500).json({ message: "Error listando procesos" });
    }
}
async function createProceso(req, res) {
    try {
        const proceso = await (0, trazabilidad_service_1.crearProceso)(req.body);
        res.status(201).json(proceso);
    }
    catch (error) {
        console.error("Error creando proceso:", error);
        res.status(400).json({ message: "Error creando proceso" });
    }
}
async function getTrazabilidadResumen(_req, res) {
    try {
        const resumen = await (0, trazabilidad_service_1.obtenerResumenTrazabilidad)();
        res.json(resumen);
    }
    catch (error) {
        console.error("Error obteniendo resumen de trazabilidad:", error);
        res.status(500).json({ message: "Error obteniendo resumen de trazabilidad" });
    }
}
//# sourceMappingURL=trazabilidad.controller.js.map