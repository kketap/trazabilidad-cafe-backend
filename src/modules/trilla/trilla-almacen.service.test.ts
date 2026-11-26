import { prisma } from "../../config/prisma";
import { crearEmpaque } from "../empaque/empaque.service";
import { crearOrdenTrilla } from "./trilla.service";

jest.mock("../../config/prisma", () => ({ prisma: { $transaction: jest.fn() } }));

const transaccion = prisma.$transaction as jest.Mock;

describe("Peso seco y envío conjunto", () => {
    const ingreso = {
        codigo: "QA-EMP-001", loteId: 10, secadoIds: [57], perfilSecado: "HONEY",
        fechaInicio: "2026-11-24T12:30:00Z", kilosIngresados: 105, kilosResultantes: 100, muestra: true,
    };

    it("acepta un secado terminado sin pesar y guarda el peso manual en almacén", async () => {
        const create = jest.fn().mockImplementation(({ data }) => ({
            ...data, ordenesTrilla: [], enviosTrilla: [],
        }));
        transaccion.mockImplementation((operacion) => operacion({
            lote: { findUnique: jest.fn().mockResolvedValue({ id: 10, activo: true }) },
            secado: { findMany: jest.fn().mockResolvedValue([
                { fechaFin: new Date("2026-11-24"), perfilProceso: "HONEY", loteId: 10, secadoLotes: [] },
            ]) },
            empaque: { findFirst: jest.fn().mockResolvedValue(null), create },
        }));

        await expect(crearEmpaque(ingreso)).resolves.toMatchObject({
            kilosIngresados: 105, kilosResultantes: 100, merma: 5, muestra: true,
            saldoTrilla: 100, estado: "EN_ALMACEN",
        });
    });

    it("envía el saldo neto completo de cada registro y exige guía de salida", async () => {
        const create = jest.fn().mockImplementation(({ data }) => ({ ...data, almacenes: [] }));
        transaccion.mockImplementation((operacion) => operacion({
            empaque: { findMany: jest.fn().mockResolvedValue([
                { id: 11, kilosResultantes: 100, ordenesTrilla: [], enviosTrilla: [] },
                { id: 12, kilosResultantes: 200, ordenesTrilla: [{ kilosEnviados: 30 }], enviosTrilla: [] },
            ]) },
            ordenTrilla: { create },
        }));

        await expect(crearOrdenTrilla({ empaqueIds: [11, 12] })).rejects.toThrow("guía de salida");
        await crearOrdenTrilla({ empaqueIds: [11, 12], guiaSalida: "00045", kilosEnviados: 1 });
        expect(create).toHaveBeenCalledTimes(1);
        expect(create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                guiaSalida: "00045", kilosEnviados: 270,
                almacenes: { create: [{ empaqueId: 11, kilosNetos: 100 }, { empaqueId: 12, kilosNetos: 170 }] },
            }),
        }));
    });

    it("registra 60 kg y 170 kg por almacén y calcula el total sin confiar en el cliente", async () => {
        const create = jest.fn().mockImplementation(({ data }) => ({ ...data, almacenes: [] }));
        transaccion.mockImplementation((operacion) => operacion({
            empaque: { findMany: jest.fn().mockResolvedValue([
                { id: 11, kilosResultantes: 100, ordenesTrilla: [], enviosTrilla: [] },
                { id: 12, kilosResultantes: 200, ordenesTrilla: [{ kilosEnviados: 30 }], enviosTrilla: [] },
            ]) },
            ordenTrilla: { create },
        }));

        await crearOrdenTrilla({
            guiaSalida: "00046", kilosEnviados: 1,
            enviosAlmacen: [{ empaqueId: 11, kilosNetos: 60 }, { empaqueId: 12, kilosNetos: 170 }],
        });
        expect(create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                kilosEnviados: 230,
                almacenes: { create: [{ empaqueId: 11, kilosNetos: 60 }, { empaqueId: 12, kilosNetos: 170 }] },
            }),
        }));
    });

    it("rechaza el envío completo si uno de sus registros perdió saldo o tiene una cantidad inválida", async () => {
        const create = jest.fn();
        transaccion.mockImplementation((operacion) => operacion({
            empaque: { findMany: jest.fn().mockResolvedValue([
                { id: 11, kilosResultantes: 100, ordenesTrilla: [], enviosTrilla: [] },
                { id: 12, codigo: "EMP-012", kilosResultantes: 200, ordenesTrilla: [], enviosTrilla: [{ kilosNetos: 50 }] },
            ]) },
            ordenTrilla: { create },
        }));

        for (const [kilosNetos, mensaje] of [[170, /EMP-012 tiene 150 kg/], [10.001, /hasta dos decimales/]] as const) {
            await expect(crearOrdenTrilla({
                guiaSalida: "00046",
                enviosAlmacen: [{ empaqueId: 11, kilosNetos: 60 }, { empaqueId: 12, kilosNetos }],
            })).rejects.toThrow(mensaje);
        }
        expect(create).not.toHaveBeenCalled();
    });
});
