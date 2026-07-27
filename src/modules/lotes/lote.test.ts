// src/modules/lotes/lote.test.ts
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../app";
import * as lotesService from "./lotes.service";

jest.mock("./lotes.service");

const JWT_SECRET = process.env.JWT_SECRET || "changeme";
const validToken = jwt.sign(
  { userId: 1, email: "admin@fundosnoche.com", nombre: "Admin", rol: "ADMIN" },
  JWT_SECRET
);

describe("Pruebas de Integración - Módulo Lotes", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/lotes", () => {
    it("debe rechazar la petición con status 401 si no se envía token", async () => {
      const res = await request(app).get("/api/lotes");

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("message");
    });
  });

  describe("POST /api/lotes", () => {
    it("debe rechazar la petición con status 401 si no se envía token", async () => {
      const res = await request(app).post("/api/lotes").send({
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

      (lotesService.crearLote as jest.Mock).mockResolvedValue(mockLote);

      const res = await request(app)
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
