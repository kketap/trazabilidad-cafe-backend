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

  describe("POST /api/cosechas/masiva", () => {
    it("debe rechazar la petición con status 401 si no se envía token", async () => {
      const res = await request(app)
        .post("/api/cosechas/masiva")
        .attach("file", Buffer.from("dummy content"), "cosechas.xlsx");

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("message");
    });

    it("debe rechazar con status 400 si no se envía ningún archivo", async () => {
      const res = await request(app)
        .post("/api/cosechas/masiva")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.message).toMatch(/archivo/i);
    });

    it("debe procesar exitosamente el archivo Excel con token válido", async () => {
      const mockResultado = {
        totalFilasProcesadas: 2,
        totalGruposCreados: 1,
        cosechas: [
          {
            id: 10,
            fecha: "2026-08-01T00:00:00.000Z",
            kilosCosechados: 1200,
            lotes: "LOTE-01, LOTE-02",
            totalHectareas: 3.5,
            tipoCosecha: "plena",
            varietal: "Geisha",
          },
        ],
      };

      (cosechasService.procesarCargaMasivaCosechas as jest.Mock).mockResolvedValue(mockResultado);

      const fakeExcelBuffer = Buffer.from("simulated-excel-content");

      const res = await request(app)
        .post("/api/cosechas/masiva")
        .set("Authorization", `Bearer ${validToken}`)
        .attach("file", fakeExcelBuffer, "cosechas.xlsx");

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toEqual(mockResultado);
      expect(cosechasService.procesarCargaMasivaCosechas).toHaveBeenCalled();
    });

    it("debe responder con 400 si el servicio lanza un error de validación", async () => {
      (cosechasService.procesarCargaMasivaCosechas as jest.Mock).mockRejectedValue(
        new Error("Validación fallida: Los siguientes DNI de trabajadores no existen: [99999999]")
      );

      const fakeExcelBuffer = Buffer.from("simulated-excel-content");

      const res = await request(app)
        .post("/api/cosechas/masiva")
        .set("Authorization", `Bearer ${validToken}`)
        .attach("file", fakeExcelBuffer, "cosechas.xlsx");

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.message).toContain("99999999");
    });
  });
});

