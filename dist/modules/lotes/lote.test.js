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
// src/modules/lotes/lote.test.ts
const supertest_1 = __importDefault(require("supertest"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_1 = __importDefault(require("../../app"));
const lotesService = __importStar(require("./lotes.service"));
jest.mock("./lotes.service");
const JWT_SECRET = process.env.JWT_SECRET || "changeme";
const validToken = jsonwebtoken_1.default.sign({ userId: 1, email: "admin@fundosnoche.com", nombre: "Admin", rol: "ADMIN" }, JWT_SECRET);
describe("Pruebas de Integración - Módulo Lotes", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe("GET /api/lotes", () => {
        it("debe rechazar la petición con status 401 si no se envía token", async () => {
            const res = await (0, supertest_1.default)(app_1.default).get("/api/lotes");
            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty("message");
        });
    });
    describe("POST /api/lotes", () => {
        it("debe rechazar la petición con status 401 si no se envía token", async () => {
            const res = await (0, supertest_1.default)(app_1.default).post("/api/lotes").send({
                codigo: "ESC-001",
                nombre: "Lote Principal",
                tipo_cafe: "comercial",
            });
            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty("message");
        });
        it("debe crear un lote de especialidad con horas de oxidación y fermentación exitosamente", async () => {
            const mockLote = {
                id: 1,
                codigo: "ESC-001",
                nombre: "Lote Geisha Especial",
                hectareas: 3.5,
                tipo_cafe: "especial",
                horas_oxidacion: 12,
                horas_fermentacion: 36,
                activo: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            lotesService.crearLote.mockResolvedValue(mockLote);
            const res = await (0, supertest_1.default)(app_1.default)
                .post("/api/lotes")
                .set("Authorization", `Bearer ${validToken}`)
                .send({
                codigo: "ESC-001",
                nombre: "Lote Geisha Especial",
                hectareas: 3.5,
                tipo_cafe: "especial",
                horas_oxidacion: 12,
                horas_fermentacion: 36,
            });
            expect(res.status).toBe(201);
            expect(res.body.ok).toBe(true);
            expect(res.body.data).toHaveProperty("id", 1);
            expect(res.body.data).toHaveProperty("tipo_cafe", "especial");
            expect(res.body.data).toHaveProperty("horas_oxidacion", 12);
            expect(res.body.data).toHaveProperty("horas_fermentacion", 36);
        });
    });
});
//# sourceMappingURL=lote.test.js.map