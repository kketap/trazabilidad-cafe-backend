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
exports.getClientes = getClientes;
exports.getClienteById = getClienteById;
exports.createCliente = createCliente;
exports.updateCliente = updateCliente;
exports.deleteCliente = deleteCliente;
const clientesService = __importStar(require("./clientes.service"));
async function getClientes(_req, res) {
    try {
        const clientes = await clientesService.listarClientes();
        res.json({ ok: true, data: clientes });
    }
    catch (error) {
        res.status(500).json({ ok: false, message: error.message || "Error al listar clientes" });
    }
}
async function getClienteById(req, res) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, message: "ID de cliente inválido" });
            return;
        }
        const cliente = await clientesService.obtenerClientePorId(id);
        if (!cliente) {
            res.status(404).json({ ok: false, message: "Cliente no encontrado" });
            return;
        }
        res.json({ ok: true, data: cliente });
    }
    catch (error) {
        res.status(500).json({ ok: false, message: error.message || "Error al obtener cliente" });
    }
}
async function createCliente(req, res) {
    try {
        const { dni_rut, nombre, persona_juridica } = req.body;
        if (!dni_rut || !nombre) {
            res.status(400).json({ ok: false, message: "Los campos 'dni_rut' y 'nombre' son requeridos" });
            return;
        }
        const nuevoCliente = await clientesService.crearCliente({ dni_rut, nombre, persona_juridica });
        res.status(201).json({ ok: true, data: nuevoCliente });
    }
    catch (error) {
        if (error.code === "P2002") {
            res.status(400).json({ ok: false, message: "El DNI/RUT ingresado ya existe" });
            return;
        }
        res.status(500).json({ ok: false, message: error.message || "Error al crear cliente" });
    }
}
async function updateCliente(req, res) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, message: "ID de cliente inválido" });
            return;
        }
        const { dni_rut, nombre, persona_juridica } = req.body;
        const clienteActualizado = await clientesService.actualizarCliente(id, { dni_rut, nombre, persona_juridica });
        res.json({ ok: true, data: clienteActualizado });
    }
    catch (error) {
        if (error.code === "P2002") {
            res.status(400).json({ ok: false, message: "El DNI/RUT ingresado ya existe" });
            return;
        }
        res.status(500).json({ ok: false, message: error.message || "Error al actualizar cliente" });
    }
}
async function deleteCliente(req, res) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, message: "ID de cliente inválido" });
            return;
        }
        await clientesService.eliminarCliente(id);
        res.json({ ok: true, message: "Cliente eliminado correctamente" });
    }
    catch (error) {
        res.status(500).json({ ok: false, message: error.message || "Error al eliminar cliente" });
    }
}
//# sourceMappingURL=clientes.controller.js.map