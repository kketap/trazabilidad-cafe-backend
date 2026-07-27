// src/modules/trabajadores/trabajador.test.ts
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../app";
import * as trabajadoresService from "./trabajadores.service";

jest.mock("./trabajadores.service");

const JWT_SECRET = process.env.JWT_SECRET || "changeme";
const validToken = jwt.sign(
  { userId: 1, email: "admin@fundosnoche.com", nombre: "Admin", rol: "ADMIN" },
  JWT_SECRET
);

describe("Pruebas de Integración - Módulo Trabajadores", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/trabajadores", () => {
    it("debe rechazar la petición con status 401 si no se envía token", async () => {
      const res = await request(app).get("/api/trabajadores");

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("message");
    });
  });

  describe("POST /api/trabajadores", () => {
    it("debe rechazar la petición con status 401 si no se envía token", async () => {
      const res = await request(app).post("/api/trabajadores").send({
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

      (trabajadoresService.crearTrabajador as jest.Mock).mockResolvedValue(mockTrabajador);

      const res = await request(app)
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
