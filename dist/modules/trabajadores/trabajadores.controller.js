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
exports.getTrabajadores = getTrabajadores;
exports.getTrabajadorById = getTrabajadorById;
exports.createTrabajador = createTrabajador;
exports.updateTrabajador = updateTrabajador;
exports.deleteTrabajador = deleteTrabajador;
const trabajadoresService = __importStar(require("./trabajadores.service"));
async function getTrabajadores(_req, res) {
    try {
        const trabajadores = await trabajadoresService.listarTrabajadores();
        res.json({ ok: true, data: trabajadores });
    }
    catch (error) {
        res.status(500).json({ ok: false, message: error.message || "Error al listar trabajadores" });
    }
}
async function getTrabajadorById(req, res) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, message: "ID de trabajador inválido" });
            return;
        }
        const trabajador = await trabajadoresService.obtenerTrabajadorPorId(id);
        if (!trabajador) {
            res.status(404).json({ ok: false, message: "Trabajador no encontrado" });
            return;
        }
        res.json({ ok: true, data: trabajador });
    }
    catch (error) {
        res.status(500).json({ ok: false, message: error.message || "Error al obtener trabajador" });
    }
}
async function createTrabajador(req, res) {
    try {
        const { nombres, apellidos, dni, rol, telefono, activo } = req.body;
        if (!nombres || !dni) {
            res.status(400).json({
                ok: false,
                message: "Los campos 'nombres' y 'dni' son requeridos",
            });
            return;
        }
        const nuevoTrabajador = await trabajadoresService.crearTrabajador({
            nombres,
            apellidos,
            dni,
            rol,
            telefono,
            activo,
        });
        res.status(201).json({ ok: true, data: nuevoTrabajador });
    }
    catch (error) {
        if (error.code === "P2002") {
            res.status(400).json({ ok: false, message: "El DNI ingresado ya existe" });
            return;
        }
        res.status(500).json({ ok: false, message: error.message || "Error al crear trabajador" });
    }
}
async function updateTrabajador(req, res) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, message: "ID de trabajador inválido" });
            return;
        }
        const { nombres, apellidos, dni, rol, telefono, activo } = req.body;
        const trabajadorActualizado = await trabajadoresService.actualizarTrabajador(id, {
            nombres,
            apellidos,
            dni,
            rol,
            telefono,
            activo,
        });
        res.json({ ok: true, data: trabajadorActualizado });
    }
    catch (error) {
        if (error.code === "P2002") {
            res.status(400).json({ ok: false, message: "El DNI ingresado ya existe" });
            return;
        }
        res.status(500).json({ ok: false, message: error.message || "Error al actualizar trabajador" });
    }
}
async function deleteTrabajador(req, res) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, message: "ID de trabajador inválido" });
            return;
        }
        await trabajadoresService.eliminarTrabajador(id);
        res.json({ ok: true, message: "Trabajador eliminado correctamente" });
    }
    catch (error) {
        res.status(500).json({ ok: false, message: error.message || "Error al eliminar trabajador" });
    }
}
//# sourceMappingURL=trabajadores.controller.js.map