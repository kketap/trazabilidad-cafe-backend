import { prisma } from "../../config/prisma";
import { actualizarOrdenTrilla, crearOrdenTrilla, enriquecerOrdenTrilla } from "./trilla.service";

jest.mock("../../config/prisma", () => ({
    prisma: {
        $transaction: jest.fn(),
        ordenTrilla: { findUnique: jest.fn(), update: jest.fn() },
    },
}));

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
        expect(metricasRendimiento).toMatchObject({
            exportableKg: 50, exportablePct: 50, restoKg: 0, restoPct: 0,
        });
    });

    it("calcula otros subproductos registrados sin incluir los kilos aún sin distribuir", () => {
        const { metricasRendimiento } = enriquecerOrdenTrilla({
            kilosEnviados: 150, kilosNetos: 100, exportable: 1, exportable2: 2, exportable3: 3, recuperado: 4,
            malla13: 5, segundaBuena: 6, segundaMala: 7, sucioEscojo: 8, cisco: 9, descarteMaquina: 10, cascarilla: 11,
        });
        expect(metricasRendimiento).toMatchObject({
            baseKilos: 100, exportableKg: 6, recuperadoKg: 4, restoKg: 56, restoPct: 56,
        });
    });
});

describe("Peso neto de la recepción de trilla", () => {
    const buscar = prisma.ordenTrilla.findUnique as jest.Mock;
    const guardar = prisma.ordenTrilla.update as jest.Mock;
    const orden = { id: "orden-prueba", kilosEnviados: 150, kilosNetos: 120, _count: { almacenes: 0 } };

    beforeEach(() => {
        buscar.mockReset().mockResolvedValue(orden);
        guardar.mockReset().mockImplementation(({ data }) => ({ ...orden, ...data }));
    });

    it("bloquea la recepción con más kilos netos que enviados", async () => {
        await expect(actualizarOrdenTrilla(orden.id, { kilosNetos: 200 }))
            .rejects.toThrow("Los kilos netos resultantes no pueden superar los 150 kg enviados.");
        expect(guardar).not.toHaveBeenCalled();
    });

    it.each([null, 135.25, 150])("permite guardar un peso neto válido u opcional (%s)", async (kilosNetos) => {
        await actualizarOrdenTrilla(orden.id, { kilosNetos });
        expect(guardar).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: orden.id, kilosEnviados: 150, kilosNetos: 120 },
            data: { kilosNetos },
        }));
    });

    it("impide reducir los kilos enviados por debajo del peso neto guardado", async () => {
        await expect(actualizarOrdenTrilla(orden.id, { kilosEnviados: 100 }))
            .rejects.toThrow("no pueden superar los 100 kg enviados");
        expect(guardar).not.toHaveBeenCalled();
    });
});