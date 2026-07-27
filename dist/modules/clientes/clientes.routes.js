"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/clientes/clientes.routes.ts
const express_1 = require("express");
const clientes_controller_1 = require("./clientes.controller");
const router = (0, express_1.Router)();
router.get("/", clientes_controller_1.getClientes);
router.get("/:id", clientes_controller_1.getClienteById);
router.post("/", clientes_controller_1.createCliente);
router.put("/:id", clientes_controller_1.updateCliente);
router.delete("/:id", clientes_controller_1.deleteCliente);
exports.default = router;
//# sourceMappingURL=clientes.routes.js.map