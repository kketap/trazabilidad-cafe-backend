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
// src/modules/trilla/trilla.test.ts
const supertest_1 = __importDefault(require("supertest"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_1 = __importDefault(require("../../app"));
const trillaService = __importStar(require("./trilla.service"));
jest.mock("./trilla.service");
const JWT_SECRET = process.env.JWT_SECRET || "changeme";
const validToken = jsonwebtoken_1.default.sign({ userId: 1, email: "admin@fundosnoche.com", nombre: "Admin", rol: "ADMIN" }, JWT_SECRET);
describe("Módulo Trilla - Integración y API", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe("GET /api/trilla", () => {
        it("debe rechazar la petición con status 401 si no hay token", async () => {
            const res = await (0, supertest_1.default)(app_1.default).get("/api/trilla");
            expect(res.status).toBe(401);
        });
        it("debe listar órdenes de trilla con token válido", async () => {
            const mockOrdenes = [
                {
                    id: "uuid-123",
                    codigoTrilla: "TEMP-ABC12345",
                    fechaDespacho: new Date(),
                    kilosEnviados: 100,
                    lotes: [],
                },
            ];
            trillaService.listarOrdenesTrilla.mockResolvedValue(mockOrdenes);
            const res = await (0, supertest_1.default)(app_1.default)
                .get("/api/trilla")
                .set("Authorization", `Bearer ${validToken}`);
            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
            expect(res.body.data).toHaveLength(1);
        });
    });
    describe("POST /api/trilla", () => {
        it("debe rechazar si no se envían loteIds válidos", async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post("/api/trilla")
                .set("Authorization", `Bearer ${validToken}`)
                .send({ kilosEnviados: 50 });
            expect(res.status).toBe(400);
            expect(res.body.ok).toBe(false);
        });
        it("debe crear una orden de trilla correctamente", async () => {
            const mockOrden = {
                id: "uuid-123",
                codigoTrilla: "TEMP-XYZ78900",
                fechaDespacho: new Date(),
                kilosEnviados: 150,
                lotes: [{ id: 1, codigo: "LOTE-1" }],
            };
            trillaService.crearOrdenTrilla.mockResolvedValue(mockOrden);
            const res = await (0, supertest_1.default)(app_1.default)
                .post("/api/trilla")
                .set("Authorization", `Bearer ${validToken}`)
                .send({ loteIds: [1], kilosEnviados: 150 });
            expect(res.status).toBe(201);
            expect(res.body.ok).toBe(true);
            expect(res.body.data.codigoTrilla).toBe("TEMP-XYZ78900");
        });
    });
    describe("PUT /api/trilla/:id", () => {
        it("debe actualizar una orden de trilla exitosamente", async () => {
            const mockOrdenActualizada = {
                id: "uuid-123",
                codigoTrilla: "DEF-9999",
                fechaDespacho: new Date(),
                fechaIngreso: new Date(),
                calidad: "Especial",
                tipoSaco: "GrainPro",
                kilosEnviados: 150,
                kilosNetos: 120,
                lotes: [{ id: 1 }],
            };
            trillaService.actualizarOrdenTrilla.mockResolvedValue(mockOrdenActualizada);
            const res = await (0, supertest_1.default)(app_1.default)
                .put("/api/trilla/uuid-123")
                .set("Authorization", `Bearer ${validToken}`)
                .send({
                codigoTrilla: "DEF-9999",
                fechaIngreso: "2026-08-01T10:00:00.000Z",
                calidad: "Especial",
                tipoSaco: "GrainPro",
                kilosNetos: 120,
            });
            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
            expect(res.body.data.codigoTrilla).toBe("DEF-9999");
            expect(res.body.data.kilosNetos).toBe(120);
        });
    });
});
//# sourceMappingURL=trilla.test.js.map