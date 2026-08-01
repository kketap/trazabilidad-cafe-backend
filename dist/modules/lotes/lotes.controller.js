"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLotes = getLotes;
exports.getSiguienteCodigoPrincipal = getSiguienteCodigoPrincipal;
exports.getSiguienteCorrelativo = getSiguienteCorrelativo;
exports.createLote = createLote;
exports.updateLote = updateLote;
exports.deleteLote = deleteLote;
const lotes_service_1 = require("./lotes.service");
async function getLotes(_req, res) {
    try {
        const lotes = await (0, lotes_service_1.listarLotes)();
        res.json({ ok: true, data: lotes });
    }
    catch (error) {
        console.error("Error listando lotes:", error);
        res.status(500).json({ ok: false, message: "Error listando lotes" });
    }
}
/**
 * Genera el siguiente código principal:
 * COMERCIAL -> CONV-001
 * ESPECIAL -> ESC-001
 */
async function getSiguienteCodigoPrincipal(req, res) {
    try {
        const tipoCodigo = String(req.query.tipoCodigo || "COMERCIAL");
        if (!["COMERCIAL", "ESPECIAL"].includes(tipoCodigo)) {
            res.status(400).json({
                ok: false,
                message: "tipoCodigo inválido. Use COMERCIAL o ESPECIAL",
            });
            return;
        }
        const nuevoCodigo = await (0, lotes_service_1.generarCodigoPrincipalLote)(tipoCodigo);
        res.json({
            ok: true,
            data: {
                codigo: nuevoCodigo,
            },
        });
    }
    catch (error) {
        console.error("Error generando código principal de lote:", error);
        res.status(500).json({
            ok: false,
            message: "Error generando código principal de lote",
        });
    }
}
/**
 * Genera sublotes o saldos:
 * ESC-001 -> ESC-001-1
 */
async function getSiguienteCorrelativo(req, res) {
    try {
        const codigoBase = String(req.params.codigoBase || "");
        if (!codigoBase) {
            res.status(400).json({ ok: false, message: "Código base requerido" });
            return;
        }
        const nuevoCodigo = await (0, lotes_service_1.generarSiguienteCorrelativoLote)(codigoBase);
        res.json({
            ok: true,
            data: {
                codigo: nuevoCodigo,
            },
        });
    }
    catch (error) {
        console.error("Error generando correlativo de lote:", error);
        res.status(500).json({
            ok: false,
            message: "Error generando correlativo de lote",
        });
    }
}
async function createLote(req, res) {
    try {
        const { tipoCodigo, codigo } = req.body;
        if (tipoCodigo === "PERSONALIZADO" && !codigo) {
            res.status(400).json({
                ok: false,
                message: "Debe ingresar un código personalizado para el lote",
            });
            return;
        }
        const lote = await (0, lotes_service_1.crearLote)(req.body);
        res.status(201).json({
            ok: true,
            data: lote,
        });
    }
    catch (error) {
        console.error("Error creando lote:", error);
        if (error.code === "P2002") {
            res.status(400).json({
                ok: false,
                message: "El código de lote ya existe",
            });
            return;
        }
        res.status(400).json({
            ok: false,
            message: error.message || "Error creando lote",
        });
    }
}
async function updateLote(req, res) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({
                ok: false,
                message: "ID de lote inválido",
            });
            return;
        }
        const lote = await (0, lotes_service_1.actualizarLote)(id, req.body);
        res.json({
            ok: true,
            data: lote,
        });
    }
    catch (error) {
        console.error("Error actualizando lote:", error);
        if (error.code === "P2002") {
            res.status(400).json({
                ok: false,
                message: "El código de lote ya existe",
            });
            return;
        }
        res.status(400).json({
            ok: false,
            message: error.message || "Error actualizando lote",
        });
    }
}
async function deleteLote(req, res) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({
                ok: false,
                message: "ID de lote inválido",
            });
            return;
        }
        await (0, lotes_service_1.eliminarLote)(id);
        res.json({
            ok: true,
            message: "Lote eliminado o desactivado correctamente",
        });
    }
    catch (error) {
        console.error("Error eliminando lote:", error);
        res.status(400).json({
            ok: false,
            message: error.message || "Error eliminando lote",
        });
    }
}
//# sourceMappingURL=lotes.controller.js.map