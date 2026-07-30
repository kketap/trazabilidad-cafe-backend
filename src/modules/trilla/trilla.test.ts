// src/modules/trilla/trilla.test.ts
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../app";
import * as trillaService from "./trilla.service";

jest.mock("./trilla.service");

const JWT_SECRET = process.env.JWT_SECRET || "changeme";
const validToken = jwt.sign(
  { userId: 1, email: "admin@fundosnoche.com", nombre: "Admin", rol: "ADMIN" },
  JWT_SECRET
);

describe("Módulo Trilla - Integración y API", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/trilla", () => {
    it("debe rechazar la petición con status 401 si no hay token", async () => {
      const res = await request(app).get("/api/trilla");
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
      (trillaService.listarOrdenesTrilla as jest.Mock).mockResolvedValue(mockOrdenes);

      const res = await request(app)
        .get("/api/trilla")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe("POST /api/trilla", () => {
    it("debe rechazar si no se envían loteIds válidos", async () => {
      const res = await request(app)
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
      (trillaService.crearOrdenTrilla as jest.Mock).mockResolvedValue(mockOrden);

      const res = await request(app)
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
      (trillaService.actualizarOrdenTrilla as jest.Mock).mockResolvedValue(mockOrdenActualizada);

      const res = await request(app)
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
