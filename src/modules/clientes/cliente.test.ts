// src/modules/clientes/cliente.test.ts
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../app";
import * as clientesService from "./clientes.service";

jest.mock("./clientes.service");

const JWT_SECRET = process.env.JWT_SECRET || "changeme";
const validToken = jwt.sign(
  { userId: 1, email: "admin@fundosnoche.com", nombre: "Admin", rol: "ADMIN" },
  JWT_SECRET
);

describe("Pruebas de Integración - Módulo Clientes", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/clientes", () => {
    it("debe rechazar la petición con status 401 si no se envía token", async () => {
      const res = await request(app).get("/api/clientes");

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("message");
    });
  });

  describe("POST /api/clientes", () => {
    it("debe rechazar la petición con status 401 si no se envía token", async () => {
      const res = await request(app).post("/api/clientes").send({
        dni_rut: "20123456789",
        nombre: "San Crispín S.A.C.",
        persona_juridica: true,
      });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("message");
    });

    it("debe crear un cliente exitosamente si se envía un token válido y payload correcto", async () => {
      const mockCliente = {
        id: 1,
        dni_rut: "20123456789",
        nombre: "San Crispín S.A.C.",
        persona_juridica: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (clientesService.crearCliente as jest.Mock).mockResolvedValue(mockCliente);

      const res = await request(app)
        .post("/api/clientes")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          dni_rut: "20123456789",
          nombre: "San Crispín S.A.C.",
          persona_juridica: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toHaveProperty("id", 1);
      expect(res.body.data).toHaveProperty("dni_rut", "20123456789");
      expect(res.body.data).toHaveProperty("nombre", "San Crispín S.A.C.");
      expect(res.body.data).toHaveProperty("persona_juridica", true);
    });
  });
});
