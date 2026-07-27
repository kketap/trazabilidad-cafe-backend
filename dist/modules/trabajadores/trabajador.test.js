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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/trabajadores/trabajador.test.ts
const supertest_1 = __importDefault(require("supertest"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_1 = __importDefault(require("../../app"));
const trabajadoresService = __importStar(require("./trabajadores.service"));
jest.mock("./trabajadores.service");
const JWT_SECRET = process.env.JWT_SECRET || "changeme";
const validToken = jsonwebtoken_1.default.sign({ userId: 1, email: "admin@fundosnoche.com", nombre: "Admin", rol: "ADMIN" }, JWT_SECRET);
describe("Pruebas de Integración - Módulo Trabajadores", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe("GET /api/trabajadores", () => {
        it("debe rechazar la petición con status 401 si no se envía token", async () => {
            const res = await (0, supertest_1.default)(app_1.default).get("/api/trabajadores");
            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty("message");
        });
    });
    describe("POST /api/trabajadores", () => {
        it("debe rechazar la petición con status 401 si no se envía token", async () => {
            const res = await (0, supertest_1.default)(app_1.default).post("/api/trabajadores").send({
                nombres: "Juan Pérez",
                dni: "12345678",
                rol: "Cosechador",
            });
            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty("message");
        });
        it("debe crear un trabajador exitosamente si se envía un token válido y payload correcto", async () => {
            const mockTrabajador = {
                id: 1,
                nombres: "Juan Pérez",
                dni: "12345678",
                rol: "Cosechador",
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            trabajadoresService.crearTrabajador.mockResolvedValue(mockTrabajador);
            const res = await (0, supertest_1.default)(app_1.default)
                .post("/api/trabajadores")
                .set("Authorization", `Bearer ${validToken}`)
                .send({
                nombres: "Juan Pérez",
                dni: "12345678",
                rol: "Cosechador",
            });
            expect(res.status).toBe(201);
            expect(res.body.ok).toBe(true);
            expect(res.body.data).toHaveProperty("id", 1);
            expect(res.body.data).toHaveProperty("nombres", "Juan Pérez");
            expect(res.body.data).toHaveProperty("dni", "12345678");
        });
    });
});
//# sourceMappingURL=trabajador.test.js.map