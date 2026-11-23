import * as XLSX from "xlsx";
import { prisma } from "../../config/prisma";
import { previewCargaMasivaCosechas } from "./cosechas.service";

jest.mock("../../config/prisma", () => ({
    prisma: { trabajador: { findMany: jest.fn() }, lote: { findMany: jest.fn() } },
}));

it("reconoce lotes numéricos, conserva los ceros de Excel e importa Raspa", async () => {
    const hoja = XLSX.utils.aoa_to_sheet([
        ["FECHA_COSECHA", "TIPO_COSECHA", "IDENTIFICADOR_TRABAJADOR",
            "KILOS_RECOLECTADOS", "CODIGOS_LOTES", "TOTAL_HECTAREAS", "VARIETAL"],
        ["2026-11-09", "Raspa", "AB-01", 40, 12, 1, "Caturra"],
        ["2026-11-09", "Raspa", "AB-01", 20, 12, 1, "Caturra"],
    ]);
    hoja.E2.z = "0000";
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Cosechas");
    (prisma.trabajador.findMany as jest.Mock).mockResolvedValue([
        { id: 1, dni: "AB-01", nombres: "Trabajador QA" },
    ]);
    (prisma.lote.findMany as jest.Mock).mockResolvedValue([
        { id: 1, codigo: "0012" },
        { id: 2, codigo: "12" },
    ]);

    const resultado = await previewCargaMasivaCosechas(XLSX.write(libro, { type: "buffer", bookType: "xlsx" }));

    expect(resultado.filas.map((fila) => [fila.codigosLotes, fila.tipoCosecha, fila.esValida]))
        .toEqual([[["0012"], "raspa", true], [["12"], "raspa", true]]);
});
