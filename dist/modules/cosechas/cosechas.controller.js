"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCosechas = getCosechas;
exports.createCosecha = createCosecha;
exports.updateCosecha = updateCosecha;
exports.deleteCosecha = deleteCosecha;
exports.getCosechasResumen = getCosechasResumen;
exports.getCosechasReporte = getCosechasReporte;
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
        const { fecha, kilosCosechados, totalHectareas, tipoCosecha, loteIds, lotes, trabajadores, varietal, observacion, } = req.body;
        if (!fecha) {
            res.status(400).json({
                ok: false,
                message: "El campo 'fecha' es requerido",
            });
            return;
        }
        if (kilosCosechados === undefined ||
            !Number.isFinite(Number(kilosCosechados)) ||
            Number(kilosCosechados) <= 0) {
            res.status(400).json({
                ok: false,
                message: "El campo 'kilosCosechados' debe ser mayor que cero",
            });
            return;
        }
        if (totalHectareas === undefined ||
            !Number.isFinite(Number(totalHectareas)) ||
            Number(totalHectareas) <= 0) {
            res.status(400).json({
                ok: false,
                message: "El campo 'totalHectareas' debe ser mayor que cero",
            });
            return;
        }
        if (!tipoCosecha) {
            res.status(400).json({
                ok: false,
                message: "El campo 'tipoCosecha' es requerido",
            });
            return;
        }
        if (!Array.isArray(loteIds) || loteIds.length === 0) {
            res.status(400).json({
                ok: false,
                message: "Debe seleccionar al menos un lote",
            });
            return;
        }
        if (trabajadores !== undefined &&
            !Array.isArray(trabajadores)) {
            res.status(400).json({
                ok: false,
                message: "El campo 'trabajadores' debe ser una lista",
            });
            return;
        }
        const cosecha = await (0, cosechas_service_1.crearCosecha)({
            fecha: String(fecha),
            kilosCosechados: Number(kilosCosechados),
            totalHectareas: Number(totalHectareas),
            tipoCosecha: String(tipoCosecha),
            loteIds: loteIds.map((id) => Number(id)),
            lotes: lotes !== undefined
                ? String(lotes)
                : undefined,
            trabajadores: Array.isArray(trabajadores)
                ? trabajadores.map((item) => ({
                    trabajadorId: Number(item.trabajadorId),
                    kilosAsignados: item.kilosAsignados != null
                        ? Number(item.kilosAsignados)
                        : null,
                }))
                : [],
            varietal: varietal ?? null,
            observacion: observacion !== undefined &&
                observacion !== null
                ? String(observacion)
                : null,
        });
        res.status(201).json({
            ok: true,
            data: cosecha,
        });
    }
    catch (error) {
        console.error("Error creando cosecha:", error);
        res.status(400).json({
            ok: false,
            message: error.message || "Error creando cosecha",
        });
    }
}
async function updateCosecha(req, res) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({
                ok: false,
                message: "ID de cosecha inválido",
            });
            return;
        }
        if (req.body.kilosCosechados !== undefined &&
            (!Number.isFinite(Number(req.body.kilosCosechados)) ||
                Number(req.body.kilosCosechados) <= 0)) {
            res.status(400).json({
                ok: false,
                message: "Los kilos cosechados deben ser mayores que cero",
            });
            return;
        }
        if (req.body.totalHectareas !== undefined &&
            (!Number.isFinite(Number(req.body.totalHectareas)) ||
                Number(req.body.totalHectareas) <= 0)) {
            res.status(400).json({
                ok: false,
                message: "El total de hectáreas debe ser mayor que cero",
            });
            return;
        }
        if (req.body.loteIds !== undefined &&
            (!Array.isArray(req.body.loteIds) ||
                req.body.loteIds.length === 0)) {
            res.status(400).json({
                ok: false,
                message: "Debe seleccionar al menos un lote",
            });
            return;
        }
        const cosecha = await (0, cosechas_service_1.actualizarCosecha)(id, {
            ...(req.body.fecha !== undefined && {
                fecha: String(req.body.fecha),
            }),
            ...(req.body.kilosCosechados !== undefined && {
                kilosCosechados: Number(req.body.kilosCosechados),
            }),
            ...(req.body.totalHectareas !== undefined && {
                totalHectareas: Number(req.body.totalHectareas),
            }),
            ...(req.body.tipoCosecha !== undefined && {
                tipoCosecha: String(req.body.tipoCosecha),
            }),
            ...(req.body.lotes !== undefined && {
                lotes: String(req.body.lotes),
            }),
            ...(req.body.loteIds !== undefined && {
                loteIds: req.body.loteIds.map((loteId) => Number(loteId)),
            }),
            ...(req.body.trabajadores !== undefined && {
                trabajadores: req.body.trabajadores.map((item) => ({
                    trabajadorId: Number(item.trabajadorId),
                    kilosAsignados: item.kilosAsignados != null
                        ? Number(item.kilosAsignados)
                        : null,
                })),
            }),
            ...(req.body.varietal !== undefined && {
                varietal: req.body.varietal,
            }),
            ...(req.body.observacion !== undefined && {
                observacion: req.body.observacion !== null
                    ? String(req.body.observacion)
                    : null,
            }),
        });
        res.json({
            ok: true,
            data: cosecha,
        });
    }
    catch (error) {
        console.error("Error actualizando cosecha:", error);
        const status = error.code === "P2025"
            ? 404
            : 400;
        res.status(status).json({
            ok: false,
            message: error.code === "P2025"
                ? "Cosecha no encontrada"
                : error.message ||
                    "Error actualizando cosecha",
        });
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
async function getCosechasReporte(_req, res) {
    try {
        const reporte = await (0, cosechas_service_1.obtenerReporteCosechas)();
        res.json({
            ok: true,
            data: reporte,
        });
    }
    catch (error) {
        console.error("Error obteniendo reporte de cosechas:", error);
        res.status(500).json({
            ok: false,
            message: error.message || "Error obteniendo reporte de cosechas",
        });
    }
}
//# sourceMappingURL=cosechas.controller.js.map