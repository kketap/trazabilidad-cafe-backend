import { prisma } from "../../config/prisma";
import { crearOrdenTrilla, enriquecerOrdenTrilla } from "./trilla.service";

jest.mock("../../config/prisma", () => ({ prisma: { $transaction: jest.fn() } }));

describe("Trilla desde Almacén Pergamino", () => {
    const orden = { empaqueId: 1, kilosEnviados: 50 };
    const empaque = {
        id: 1,
        kilosResultantes: 100,
        ordenesTrilla: [{ kilosEnviados: 40 }],
        secado: null,
        empaqueSecados: [
            { secado: { secadoLotes: [{ loteId: 9 }, { loteId: 10 }] } },
            { secado: { loteId: 10, secadoLotes: [] } },
        ],
    };
    const crear = jest.fn();

    beforeEach(() => {
        crear.mockImplementation(({ data }) => data);
        (prisma.$transaction as jest.Mock).mockImplementation((ejecutar) => ejecutar({
            empaque: { findUnique: jest.fn().mockResolvedValue(empaque) },
            ordenTrilla: { create: crear },
        }));
    });

    it("envía stock del almacén y vincula sus lotes sin repetirlos", async () => {
        await crearOrdenTrilla(orden);
        expect(crear).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                empaqueId: 1,
                kilosEnviados: 50,
                estadoManual: "EN_PROCESO",
                lotes: { connect: [{ id: 9 }, { id: 10 }] },
            }),
        }));
    });

    it("rechaza un envío por encima del saldo restante", async () => {
        await expect(crearOrdenTrilla({ ...orden, kilosEnviados: 61 })).rejects.toThrow("60 kg disponibles");
        expect(crear).not.toHaveBeenCalled();
    });

    it("suma hasta cuatro exportables en el rendimiento", () => {
        const { metricasRendimiento } = enriquecerOrdenTrilla({
            kilosEnviados: 100, exportable: 20, exportable2: 15, exportable3: 10, exportable4: 5,
        });
        expect(metricasRendimiento).toMatchObject({ exportableKg: 50, exportablePct: 50 });
    });
});