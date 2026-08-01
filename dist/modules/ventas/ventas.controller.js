"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVentas = getVentas;
exports.getVentaById = getVentaById;
exports.createVenta = createVenta;
exports.updateVenta = updateVenta;
exports.deleteVenta = deleteVenta;
const ventasService = __importStar(require("./ventas.service"));
async function getVentas(_req, res) {
    try {
        const ventas = await ventasService.listarVentas();
        res.json({ ok: true, data: ventas });
    }
    catch (error) {
        console.error("Error listando ventas:", error);
        res.status(500).json({ ok: false, message: error.message || "Error al listar ventas" });
    }
}
async function getVentaById(req, res) {
    try {
        const id = String(req.params.id || "");
        if (!id) {
            res.status(400).json({ ok: false, message: "ID requerido" });
            return;
        }
        const venta = await ventasService.obtenerVentaPorId(id);
        if (!venta) {
            res.status(404).json({ ok: false, message: "Venta no encontrada" });
            return;
        }
        res.json({ ok: true, data: venta });
    }
    catch (error) {
        console.error("Error obteniendo venta:", error);
        res.status(500).json({ ok: false, message: error.message || "Error al obtener venta" });
    }
}
async function createVenta(req, res) {
    try {
        const { producto, kilosVendidos, presentacionSacos, precioVentaKilo, clienteId, ordenTrillaId, } = req.body;
        if (!producto?.trim()) {
            res.status(400).json({ ok: false, message: "El campo 'producto' es requerido" });
            return;
        }
        if (kilosVendidos === undefined || kilosVendidos === null || isNaN(Number(kilosVendidos))) {
            res.status(400).json({ ok: false, message: "El campo 'kilosVendidos' es obligatorio y debe ser numérico" });
            return;
        }
        if (!presentacionSacos?.trim()) {
            res.status(400).json({ ok: false, message: "El campo 'presentacionSacos' es requerido" });
            return;
        }
        if (precioVentaKilo === undefined || precioVentaKilo === null || isNaN(Number(precioVentaKilo))) {
            res.status(400).json({ ok: false, message: "El campo 'precioVentaKilo' es obligatorio y debe ser numérico" });
            return;
        }
        if (clienteId === undefined || clienteId === null || isNaN(Number(clienteId))) {
            res.status(400).json({ ok: false, message: "El campo 'clienteId' es obligatorio y debe ser numérico" });
            return;
        }
        if (!ordenTrillaId?.trim()) {
            res.status(400).json({ ok: false, message: "El campo 'ordenTrillaId' es requerido" });
            return;
        }
        const venta = await ventasService.crearVenta(req.body);
        res.status(201).json({ ok: true, data: venta });
    }
    catch (error) {
        console.error("Error creando venta:", error);
        res.status(400).json({ ok: false, message: error.message || "Error al crear venta" });
    }
}
async function updateVenta(req, res) {
    try {
        const id = String(req.params.id || "");
        if (!id) {
            res.status(400).json({ ok: false, message: "ID requerido" });
            return;
        }
        const venta = await ventasService.actualizarVenta(id, req.body);
        res.json({ ok: true, data: venta });
    }
    catch (error) {
        console.error("Error actualizando venta:", error);
        res.status(400).json({ ok: false, message: error.message || "Error al actualizar venta" });
    }
}
async function deleteVenta(req, res) {
    try {
        const id = String(req.params.id || "");
        if (!id) {
            res.status(400).json({ ok: false, message: "ID requerido" });
            return;
        }
        await ventasService.eliminarVenta(id);
        res.json({ ok: true, message: "Venta eliminada correctamente" });
    }
    catch (error) {
        console.error("Error eliminando venta:", error);
        res.status(400).json({ ok: false, message: error.message || "Error al eliminar venta" });
    }
}
//# sourceMappingURL=ventas.controller.js.map