"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProcesos = getProcesos;
exports.createProceso = createProceso;
exports.getTrazabilidadResumen = getTrazabilidadResumen;
exports.updateProceso = updateProceso;
exports.deleteProceso = deleteProceso;
const trazabilidad_service_1 = require("./trazabilidad.service");
function getRangoMesActual() {
    const now = new Date();
    const desde = new Date(now.getFullYear(), now.getMonth(), 1);
    const hasta = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { desde, hasta };
}
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
async function getTrazabilidadResumen(req, res) {
    try {
        const periodo = req.query.periodo;
        const filtros = periodo === "mes-actual" ? getRangoMesActual() : {};
        const resumen = await (0, trazabilidad_service_1.obtenerResumenTrazabilidad)(filtros);
        res.json(resumen);
    }
    catch (error) {
        console.error("Error obteniendo resumen de trazabilidad:", error);
        res.status(500).json({ message: "Error obteniendo resumen de trazabilidad" });
    }
}
async function updateProceso(req, res) {
    try {
        const id = Number(req.params.id);
        const proceso = await (0, trazabilidad_service_1.actualizarProceso)(id, req.body);
        res.json(proceso);
    }
    catch (error) {
        console.error("Error actualizando proceso:", error);
        res.status(400).json({ message: "Error actualizando proceso" });
    }
}
async function deleteProceso(req, res) {
    try {
        const id = Number(req.params.id);
        await (0, trazabilidad_service_1.eliminarProceso)(id);
        res.json({ message: "Proceso eliminado correctamente" });
    }
    catch (error) {
        console.error("Error eliminando proceso:", error);
        res.status(400).json({ message: "Error eliminando proceso" });
    }
}
//# sourceMappingURL=trazabilidad.controller.js.map