import { prisma } from "../../config/prisma";
import { actualizarLote, crearLote, eliminarLote, listarLotes, obtenerLotePorId } from "./lotes.service";

jest.mock("../../config/prisma", () => ({
    prisma: { $transaction: jest.fn(), lote: { findMany: jest.fn(), findUnique: jest.fn() } },
}));

describe("Pesos del lote", () => {
    it("al crear con cosechas usa los aportes como peso inicial y saldo", async () => {
        const crear = jest.fn().mockImplementation(({ data }) => data);
        (prisma.$transaction as jest.Mock).mockImplementation((operacion) => operacion({
            cosecha: { findUnique: jest.fn().mockResolvedValue({ kilosCosechados: 500, cosechaLotes: [] }) },
            lote: { create: crear },
        }));

        const lote = await crearLote({
            codigo: "CONV-001",
            kilosIniciales: 999,
            kilosActuales: 300,
            cosechas: [{ cosechaId: 55, kilosUsados: 380 }, { cosechaId: 51, kilosUsados: 120.25 }],
        });
        expect(lote).toMatchObject({ kilosIniciales: 500.25, kilosActuales: 500.25 });
    });

    it("cuenta aportes de secado e históricos de un solo lote en listado y detalle", async () => {
        const lote = {
            id: 3, kilosIniciales: 200, kilosActuales: 0,
            secadoLotes: [{ kilosUsados: 150 }],
            secados: [{ kilosIngresados: 50 }],
        };
        const loteConSaldoAjustado = {
            id: 4, kilosIniciales: 200, kilosActuales: 50, secadoLotes: [], secados: [],
        };
        (prisma.lote.findMany as jest.Mock).mockResolvedValue([lote, loteConSaldoAjustado]);
        (prisma.lote.findUnique as jest.Mock).mockResolvedValue(lote);

        await expect(listarLotes()).resolves.toMatchObject([
            { id: 3, kilosProcesados: 200 },
            { id: 4, kilosProcesados: 0 },
        ]);
        await expect(obtenerLotePorId(3)).resolves.toMatchObject({ id: 3, kilosProcesados: 200 });
        expect(prisma.lote.findUnique).toHaveBeenCalledWith(expect.objectContaining({
            include: expect.objectContaining({ secados: expect.objectContaining({
                where: { secadoLotes: { none: {} } },
            }) }),
        }));
    });
});

describe("Eliminar lote", () => {
    const eliminarSinHistorial = jest.fn();
    const desactivar = jest.fn();

    beforeEach(() => {
        (prisma.$transaction as jest.Mock).mockImplementation((operacion) => operacion({
            lote: { deleteMany: eliminarSinHistorial, update: desactivar },
        }));
    });

    it("desactiva un lote con historial y conserva el saldo y sus relaciones", async () => {
        eliminarSinHistorial.mockResolvedValue({ count: 0 });

        await expect(eliminarLote(28)).resolves.toBe("desactivado");
        expect(eliminarSinHistorial).toHaveBeenCalledWith({
            where: {
                id: 28,
                ordenTrillaId: null,
                cosechaLotes: { none: {} },
                ProcesoTrazabilidad: { none: {} },
                procesoLotes: { none: {} },
                secados: { none: {} },
                secadoLotes: { none: {} },
                empaques: { none: {} },
                ordenTrillaLotes: { none: {} },
            },
        });
        expect(desactivar).toHaveBeenCalledWith({
            where: { id: 28 },
            data: { activo: false, estado: "INACTIVO" },
        });
    });

    it("elimina un lote sin historial sin intentar desactivarlo", async () => {
        eliminarSinHistorial.mockResolvedValue({ count: 1 });

        await expect(eliminarLote(28)).resolves.toBe("eliminado");
        expect(desactivar).not.toHaveBeenCalled();
    });
});

describe("Editar cosechas asociadas a un lote", () => {
    const buscarLote = jest.fn();
    const buscarCosecha = jest.fn();
    const actualizar = jest.fn();
    const aportes = [{ cosechaId: 55, kilosUsados: 360.5 }];

    beforeEach(() => {
        actualizar.mockReset();
        buscarLote.mockResolvedValue({
            kilosIniciales: 780,
            kilosActuales: 500,
            updatedAt: new Date("2026-11-25T12:00:00.000Z"),
        });
        buscarCosecha.mockResolvedValue({ kilosCosechados: 400, cosechaLotes: [{ kilosUsados: 30 }] });
        (prisma.$transaction as jest.Mock).mockImplementation((operacion) => operacion({
            lote: { findUniqueOrThrow: buscarLote, update: actualizar },
            cosecha: { findUnique: buscarCosecha },
        }));
    });

    it("descuenta de la disponibilidad solo los aportes de otros lotes y conserva el peso descontado", async () => {
        await actualizarLote(32, { cosechas: aportes });
        expect(buscarCosecha).toHaveBeenCalledWith({
            where: { id: 55 },
            include: { cosechaLotes: { where: { loteId: { not: 32 } } } },
        });
        expect(actualizar).toHaveBeenCalledWith(expect.objectContaining({
            data: {
                kilosIniciales: 360.5,
                kilosActuales: 80.5,
                cosechaLotes: {
                    deleteMany: { cosechaId: { notIn: [55] } },
                    upsert: [{
                        where: { cosechaId_loteId: { cosechaId: 55, loteId: 32 } },
                        create: aportes[0],
                        update: { kilosUsados: 360.5 },
                    }],
                },
            },
        }));
    });

    it("guarda ambos pesos ingresados manualmente junto con el cambio de cosechas", async () => {
        await actualizarLote(32, { cosechas: aportes, kilosIniciales: 350.25, kilosActuales: 65.5 });
        expect(actualizar).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ kilosIniciales: 350.25, kilosActuales: 65.5 }),
        }));
    });

    it("rechaza pesos que superan los aportes o recuperan kilos ya descontados", async () => {
        await expect(actualizarLote(32, { cosechas: aportes, kilosIniciales: 400 }))
            .rejects.toThrow("ingresa un peso inicial entre 280 y 360.5 kg");
        await expect(actualizarLote(32, { cosechas: aportes, kilosIniciales: 350, kilosActuales: 90 }))
            .rejects.toThrow("ingresa entre 0 y 70 kg actuales");
        expect(actualizar).not.toHaveBeenCalled();
    });

    it("impide guardar más kilos de los que permite el saldo de la cosecha", async () => {
        await expect(actualizarLote(32, { cosechas: [{ cosechaId: 55, kilosUsados: 380 }] }))
            .rejects.toThrow("La cosecha COS-055 tiene 370 kg disponibles para este lote.");
        expect(actualizar).not.toHaveBeenCalled();
    });

    it("permite desvincular todas las cosechas si el lote no tiene kilos descontados", async () => {
        buscarLote.mockResolvedValue({ kilosIniciales: 350, kilosActuales: 350 });
        await actualizarLote(32, { cosechas: [] });
        expect(actualizar).toHaveBeenCalledWith(expect.objectContaining({
            data: { kilosIniciales: 0, kilosActuales: 0, cosechaLotes: { deleteMany: {}, upsert: [] } },
        }));
    });

    it("rechaza quitar los aportes que respaldan kilos ya descontados", async () => {
        await expect(actualizarLote(32, { cosechas: [] }))
            .rejects.toThrow("Las cosechas deben aportar al menos 280 kg");
        expect(actualizar).not.toHaveBeenCalled();
    });

    it("rechaza guardar aportes de una versión anterior del lote", async () => {
        await expect(actualizarLote(32, { cosechas: aportes, versionLote: "2026-11-25T10:00:00.000Z" }))
            .rejects.toThrow("El lote cambió desde que abriste el formulario.");
        expect(actualizar).not.toHaveBeenCalled();
    });
});
