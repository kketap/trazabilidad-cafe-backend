import { prisma } from "../../config/prisma";
import { actualizarSecado, crearSecado, eliminarSecado } from "./secado.service";

jest.mock("../../config/prisma", () => ({ prisma: { $transaction: jest.fn() } }));

const transaction = prisma.$transaction as jest.Mock;
const base = {
    fechaInicio: "2026-11-19",
    kilosIngresados: 500,
    lotes: [{ loteId: 1, kilosUsados: 200 }, { loteId: 2, kilosUsados: 300 }],
};

function prepararInventario() {
    const lotes = new Map([
        [1, { id: 1, activo: true, codigo: "A", kilosActuales: 200 }],
        [2, { id: 2, activo: true, codigo: "B", kilosActuales: 400 }],
    ]);
    let secado: Record<string, unknown> | null = null;
    const guardar = ({ data }: { data: Record<string, unknown> & {
        secadoLotes: { create: unknown[] };
    } }) => {
        secado = { id: 9, ...secado, ...data, secadoLotes: data.secadoLotes.create };
        return secado;
    };
    const tx = {
        lote: {
            findUnique: ({ where }: { where: { id: number } }) => lotes.get(where.id),
            update: ({ where, data }: { where: { id: number }; data: { kilosActuales: number } }) =>
                Object.assign(lotes.get(where.id)!, data),
        },
        secado: {
            findMany: () => [],
            findUnique: () => secado,
            count: () => 0,
            create: guardar,
            update: guardar,
            delete: () => {
                const anterior = secado;
                secado = null;
                return anterior;
            },
        },
        empaque: { count: () => 0 },
    };
    transaction.mockImplementation((ejecutar) => ejecutar(tx));
    return lotes;
}

describe("Inventario de Secado", () => {
    it("rechaza un peso resultante mayor al ingresado antes de abrir una transacción", async () => {
        await expect(crearSecado({ ...base, kilosResultantes: 501 })).rejects.toThrow("no pueden superar");
        expect(transaction).not.toHaveBeenCalled();
    });

    it("rechaza un reparto que no suma el peso ingresado", async () => {
        await expect(crearSecado({ ...base, kilosIngresados: 499 })).rejects.toThrow("suma de los aportes");
        expect(transaction).not.toHaveBeenCalled();
    });

    it("descuenta, edita y devuelve los aportes a sus lotes originales", async () => {
        const lotes = prepararInventario();

        const secado = await crearSecado(base);
        expect(secado).toMatchObject({ kilosResultantes: null, merma: null });
        expect([lotes.get(1)?.kilosActuales, lotes.get(2)?.kilosActuales]).toEqual([0, 100]);

        await actualizarSecado(9, {
            kilosResultantes: 500,
            lotes: [{ loteId: 1, kilosUsados: 150.5 }, { loteId: 2, kilosUsados: 349.5 }],
        });
        expect([lotes.get(1)?.kilosActuales, lotes.get(2)?.kilosActuales]).toEqual([49.5, 50.5]);

        await eliminarSecado(9);
        expect([lotes.get(1)?.kilosActuales, lotes.get(2)?.kilosActuales]).toEqual([200, 400]);
    });
});
