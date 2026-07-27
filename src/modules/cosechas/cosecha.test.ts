// src/modules/cosechas/cosecha.test.ts
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../app";
import * as cosechasService from "./cosechas.service";

jest.mock("./cosechas.service");

const JWT_SECRET = process.env.JWT_SECRET || "changeme";
const validToken = jwt.sign(
  { userId: 1, email: "admin@fundosnoche.com", nombre: "Admin", rol: "ADMIN" },
  JWT_SECRET
);

describe("Pruebas de Integración - Módulo Cosechas", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/cosechas", () => {
    it("debe rechazar la petición con status 401 si no se envía token", async () => {
      const res = await request(app).get("/api/cosechas");

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("message");
    });
  });

  describe("POST /api/cosechas", () => {
    it("debe rechazar la petición con status 401 si no se envía token", async () => {
      const res = await request(app).post("/api/cosechas").send({
        fecha: "2026-07-27",
        kilosCosechados: 500,
        cantidadCosechadores: 5,
        totalHectareas: 2,
        tipo_cosecha: "plena",
        trabajadorId: 1,
      });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("message");
    });

    it("debe crear una cosecha exitosamente vinculada a un trabajador con token válido", async () => {
      const mockCosecha = {
        id: 1,
        fecha: new Date("2026-07-27"),
        kilosCosechados: 500,
        cantidadCosechadores: 5,
        lotes: "Lote 1",
        totalHectareas: 2,
        tipoCosecha: "plena",
        tipo_cosecha: "plena",
        trabajadorId: 1,
        trabajador: { id: 1, nombres: "Juan Pérez", dni: "12345678" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (cosechasService.crearCosecha as jest.Mock).mockResolvedValue(mockCosecha);

      const res = await request(app)
        .post("/api/cosechas")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          fecha: "2026-07-27",
          kilosCosechados: 500,
          cantidadCosechadores: 5,
          totalHectareas: 2,
          tipo_cosecha: "plena",
          trabajadorId: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toHaveProperty("id", 1);
      expect(res.body.data).toHaveProperty("trabajadorId", 1);
    });
  });
});
