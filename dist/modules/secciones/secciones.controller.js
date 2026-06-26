"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecciones = getSecciones;
exports.getSeccion = getSeccion;
exports.createSeccion = createSeccion;
exports.updateSeccion = updateSeccion;
exports.deleteSeccion = deleteSeccion;
exports.getCalculosGenerales = getCalculosGenerales;
const secciones_service_1 = require("./secciones.service");
async function getSecciones(_req, res) {
    try {
        const secciones = await (0, secciones_service_1.listarSecciones)();
        res.json(secciones);
    }
    catch (error) {
        console.error("Error listando secciones:", error);
        res.status(500).json({ message: "Error listando secciones" });
    }
}
async function getSeccion(req, res) {
    try {
        const id = Number(req.params.id);
        const seccion = await (0, secciones_service_1.obtenerSeccion)(id);
        if (!seccion) {
            res.status(404).json({ message: "Sección no encontrada" });
            return;
        }
        res.json(seccion);
    }
    catch (error) {
        console.error("Error obteniendo sección:", error);
        res.status(500).json({ message: "Error obteniendo sección" });
    }
}
async function createSeccion(req, res) {
    try {
        const seccion = await (0, secciones_service_1.crearSeccion)(req.body);
        res.status(201).json(seccion);
    }
    catch (error) {
        console.error("Error creando sección:", error);
        res.status(400).json({ message: "Error creando sección" });
    }
}
async function updateSeccion(req, res) {
    try {
        const id = Number(req.params.id);
        const seccion = await (0, secciones_service_1.actualizarSeccion)(id, req.body);
        res.json(seccion);
    }
    catch (error) {
        console.error("Error actualizando sección:", error);
        res.status(400).json({ message: "Error actualizando sección" });
    }
}
async function deleteSeccion(req, res) {
    try {
        const id = Number(req.params.id);
        await (0, secciones_service_1.eliminarSeccion)(id);
        res.json({ message: "Sección eliminada correctamente" });
    }
    catch (error) {
        console.error("Error eliminando sección:", error);
        res.status(400).json({ message: "Error eliminando sección" });
    }
}
async function getCalculosGenerales(_req, res) {
    try {
        const calculos = await (0, secciones_service_1.obtenerCalculosGenerales)();
        res.json(calculos);
    }
    catch (error) {
        console.error("Error obteniendo cálculos generales:", error);
        res.status(500).json({ message: "Error obteniendo cálculos generales" });
    }
}
//# sourceMappingURL=secciones.controller.js.map