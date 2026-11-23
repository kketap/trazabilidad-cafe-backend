import { prisma } from "../../config/prisma";
import { eliminarLote } from "./lotes.service";

jest.mock("../../config/prisma", () => ({ prisma: { $transaction: jest.fn() } }));

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
