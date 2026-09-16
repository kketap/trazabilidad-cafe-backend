import { prisma } from "../../config/prisma";
import * as XLSX from "xlsx";

export type CosechaInput = {
    fecha: string;
    kilosCosechados: number;
    cantidadCosechadores?: number;
    lotes?: string;
    loteIds?: number[];
    totalHectareas: number;
    tipoCosecha?: string;
    trabajadorId: number;
    tipo_cosecha?: string;
    kilos_diarios?: number;
    kilos_quincena?: number;
    kilos_mensuales?: number;
    varietal?: string;
};

export function normalizeTipoCosecha(val?: string): string {
    if (!val) return "plena";
    const lower = val.toLowerCase().trim();
    if (lower === "manual") return "plena";
    if (lower === "rebusque") return "rebusca";
    if (lower === "selectiva") return "selectiva";
    return lower;
}

export async function listarCosechas() {
    return prisma.cosecha.findMany({
        include: {
            CosechaTrabajador: {
                include: {
                    Trabajador: true,
                },
            },
            cosechaLotes: {
                include: {
                    lote: true,
                },
            },
        },
        orderBy: {
            fecha: "desc",
        },
    });
}

export async function obtenerCosechaPorId(id: number) {
    return prisma.cosecha.findUnique({
        where: { id },
        include: {
            CosechaTrabajador: {
                include: {
                    Trabajador: true,
                },
            },
            cosechaLotes: {
                include: {
                    lote: true,
                },
            },
        },
    });
}

export async function crearCosecha(data: CosechaInput) {
    const loteIds = data.loteIds ?? [];

    const lotesTexto =
        data.lotes ||
        (loteIds.length > 0
            ? `Lotes seleccionados: ${loteIds.join(", ")}`
            : "");

    const rawTipo = data.tipo_cosecha || data.tipoCosecha;
    const tipoCosechaFinal = normalizeTipoCosecha(rawTipo);

    return prisma.cosecha.create({
        data: {
            fecha: new Date(data.fecha),
            kilosCosechados: Number(data.kilosCosechados),
            lotes: lotesTexto,
            totalHectareas: Number(data.totalHectareas),
            tipoCosecha: tipoCosechaFinal,
            tipo_cosecha: tipoCosechaFinal,
            kilos_diarios: data.kilos_diarios !== undefined ? Number(data.kilos_diarios) : null,
            kilos_quincena: data.kilos_quincena !== undefined ? Number(data.kilos_quincena) : null,
            kilos_mensuales: data.kilos_mensuales !== undefined ? Number(data.kilos_mensuales) : null,
            varietal: data.varietal,

            // Relación a través de la tabla intermedia
            CosechaTrabajador: {
                create: {
                    trabajadorId: Number(data.trabajadorId),
                },
            },
            cosechaLotes: {
                create: loteIds.map((loteId) => ({
                    lote: {
                        connect: {
                            id: Number(loteId),
                        },
                    },
                })),
            },
        },
        include: {
            CosechaTrabajador: {
                include: {
                    Trabajador: true,
                },
            },
            cosechaLotes: {
                include: {
                    lote: true,
                },
            },
        },
    });
}

export async function actualizarCosecha(id: number, data: Partial<CosechaInput>) {
    const loteIds = data.loteIds;
    const rawTipo = data.tipo_cosecha || data.tipoCosecha;
    const tipoCosechaFinal = rawTipo !== undefined ? normalizeTipoCosecha(rawTipo) : undefined;

    return prisma.$transaction(async (tx) => {
        // Actualización de la entidad principal omitiendo trabajadorId
        await tx.cosecha.update({
            where: { id },
            data: {
                ...(data.fecha && { fecha: new Date(data.fecha) }),
                ...(data.kilosCosechados !== undefined && {
                    kilosCosechados: Number(data.kilosCosechados),
                }),
                ...(data.lotes !== undefined && { lotes: data.lotes }),
                ...(data.totalHectareas !== undefined && {
                    totalHectareas: Number(data.totalHectareas),
                }),
                ...(tipoCosechaFinal !== undefined && {
                    tipoCosecha: tipoCosechaFinal,
                    tipo_cosecha: tipoCosechaFinal,
                }),
                ...(data.kilos_diarios !== undefined && {
                    kilos_diarios: data.kilos_diarios ? Number(data.kilos_diarios) : null,
                }),
                ...(data.kilos_quincena !== undefined && {
                    kilos_quincena: data.kilos_quincena ? Number(data.kilos_quincena) : null,
                }),
                ...(data.kilos_mensuales !== undefined && {
                    kilos_mensuales: data.kilos_mensuales ? Number(data.kilos_mensuales) : null,
                }),
                ...(data.varietal !== undefined && { varietal: data.varietal }),
            },
        });

        // Reconstrucción de la relación con Trabajador si viene en el payload
        if (data.trabajadorId !== undefined) {
            await tx.cosechaTrabajador.deleteMany({
                where: { cosechaId: id },
            });

            await tx.cosechaTrabajador.create({
                data: {
                    cosechaId: id,
                    trabajadorId: Number(data.trabajadorId),
                },
            });
        }

        // Reconstrucción de la relación con Lotes
        if (loteIds !== undefined) {
            await tx.cosechaLote.deleteMany({
                where: {
                    cosechaId: id,
                },
            });

            if (loteIds.length > 0) {
                await tx.cosechaLote.createMany({
                    data: loteIds.map((loteId) => ({
                        cosechaId: id,
                        loteId: Number(loteId),
                    })),
                    skipDuplicates: true,
                });
            }
        }

        return tx.cosecha.findUnique({
            where: { id },
            include: {
                CosechaTrabajador: {
                    include: {
                        Trabajador: true,
                    },
                },
                cosechaLotes: {
                    include: {
                        lote: true,
                    },
                },
            },
        });
    });
}

export async function eliminarCosecha(id: number) {
    return prisma.cosecha.delete({
        where: { id },
    });
}

type ResumenFiltros = {
    desde?: Date;
    hasta?: Date;
};

export async function obtenerResumenCosechas(filtros: ResumenFiltros = {}) {
    const cosechas = await prisma.cosecha.findMany({
        where: {
            ...(filtros.desde || filtros.hasta
                ? {
                    fecha: {
                        ...(filtros.desde && { gte: filtros.desde }),
                        ...(filtros.hasta && { lt: filtros.hasta }),
                    },
                }
                : {}),
        },
        include: {
            CosechaTrabajador: {
                include: {
                    Trabajador: true,
                },
            },
            cosechaLotes: {
                include: {
                    lote: true,
                },
            },
        },
    });

    const kilosTotales = cosechas.reduce(
        (total, cosecha) => total + cosecha.kilosCosechados,
        0,
    );

    const totalHectareas = cosechas.reduce(
        (total, cosecha) => total + cosecha.totalHectareas,
        0,
    );

    const rendimiento =
        totalHectareas > 0 ? kilosTotales / totalHectareas : 0;

    // Mejor trabajador
    const trabajadorKilos = new Map<number, { id: number; nombre: string; kilos: number }>();
    for (const c of cosechas) {
        for (const ct of c.CosechaTrabajador) {
            if (ct.Trabajador) {
                const tId = ct.Trabajador.id;
                const cur = trabajadorKilos.get(tId) || {
                    id: tId,
                    nombre: `${ct.Trabajador.nombres}${ct.Trabajador.apellidos ? " " + ct.Trabajador.apellidos : ""}`,
                    kilos: 0,
                };
                cur.kilos += c.kilosCosechados;
                trabajadorKilos.set(tId, cur);
            }
        }
    }
    let mejorTrabajador: { id: number; nombre: string; kilos: number } | null = null;
    for (const t of trabajadorKilos.values()) {
        if (!mejorTrabajador || t.kilos > mejorTrabajador.kilos) {
            mejorTrabajador = t;
        }
    }

    // Mejor lote
    const loteKilos = new Map<number, { id: number; codigo: string; nombre?: string | null; kilos: number }>();
    for (const c of cosechas) {
        for (const cl of c.cosechaLotes) {
            if (cl.lote) {
                const lId = cl.lote.id;
                const cur = loteKilos.get(lId) || {
                    id: lId,
                    codigo: cl.lote.codigo,
                    nombre: cl.lote.nombre,
                    kilos: 0,
                };
                cur.kilos += c.kilosCosechados;
                loteKilos.set(lId, cur);
            }
        }
    }
    let mejorLote: { id: number; codigo: string; nombre?: string | null; kilos: number } | null = null;
    for (const l of loteKilos.values()) {
        if (!mejorLote || l.kilos > mejorLote.kilos) {
            mejorLote = l;
        }
    }

    return {
        totalCosechas: cosechas.length,
        kilosTotales,
        totalHectareas,
        rendimiento,
        mejorTrabajador,
        mejorLote,
    };
}

export async function obtenerReporteCosechas() {
    const cosechas = await prisma.cosecha.findMany({
        orderBy: { fecha: "asc" },
        include: {
            CosechaTrabajador: {
                include: {
                    Trabajador: true,
                },
            },
            cosechaLotes: {
                include: {
                    lote: true,
                },
            },
        },
    });

    const diaMap = new Map<
        string,
        {
            fecha: string;
            kilos: number;
            cantidadRegistros: number;
            detalles: {
                id: number;
                kilosCosechados: number;
                totalHectareas: number;
                tipoCosecha: string;
                varietal: string | null;
                lotes: { id: number; codigo: string; nombre: string | null; hectareas: number | null }[];
                trabajadores: { id: number; nombre: string; dni: string; kilosAsignados: number | null }[];
            }[];
        }
    >();

    const mesMap = new Map<string, number>();
    const quincenaMap = new Map<string, number>();
    const tipoMap = new Map<string, number>();
    const trabajadorMap = new Map<number, { trabajadorId: number; nombre: string; dni: string; kilos: number; cosechas: number }>();
    const loteMap = new Map<number, { loteId: number; codigo: string; nombre: string | null; kilos: number; cosechas: number }>();

    for (const c of cosechas) {
        const fechaObj = new Date(c.fecha);
        const yyyy = fechaObj.getFullYear();
        const mm = String(fechaObj.getMonth() + 1).padStart(2, "0");
        const dd = String(fechaObj.getDate()).padStart(2, "0");

        const diaKey = `${yyyy}-${mm}-${dd}`;
        let diaEntry = diaMap.get(diaKey);
        if (!diaEntry) {
            diaEntry = { fecha: diaKey, kilos: 0, cantidadRegistros: 0, detalles: [] };
            diaMap.set(diaKey, diaEntry);
        }
        diaEntry.kilos += c.kilosCosechados;
        diaEntry.cantidadRegistros += 1;
        diaEntry.detalles.push({
            id: c.id,
            kilosCosechados: c.kilosCosechados,
            totalHectareas: c.totalHectareas,
            tipoCosecha: c.tipoCosecha,
            varietal: c.varietal ?? null,
            lotes: c.cosechaLotes
                .filter((cl) => cl.lote)
                .map((cl) => ({
                    id: cl.lote.id,
                    codigo: cl.lote.codigo,
                    nombre: cl.lote.nombre ?? null,
                    hectareas: cl.lote.hectareas ?? null,
                })),
            trabajadores: c.CosechaTrabajador
                .filter((ct) => ct.Trabajador)
                .map((ct) => ({
                    id: ct.Trabajador.id,
                    nombre: `${ct.Trabajador.nombres}${ct.Trabajador.apellidos ? " " + ct.Trabajador.apellidos : ""}`,
                    dni: ct.Trabajador.dni || "",
                    kilosAsignados: ct.kilosAsignados ?? null,
                })),
        });

        const mesKey = `${yyyy}-${mm}`;
        mesMap.set(mesKey, (mesMap.get(mesKey) || 0) + c.kilosCosechados);

        const dayNum = fechaObj.getDate();
        const qNum = dayNum <= 15 ? 1 : 2;
        const quincenaKey = `${yyyy}-${mm}-Q${qNum}`;
        quincenaMap.set(quincenaKey, (quincenaMap.get(quincenaKey) || 0) + c.kilosCosechados);

        const tipoKey = c.tipoCosecha || "No especificado";
        tipoMap.set(tipoKey, (tipoMap.get(tipoKey) || 0) + c.kilosCosechados);

        for (const ct of c.CosechaTrabajador) {
            if (ct.Trabajador) {
                const tId = ct.Trabajador.id;
                const kilosTrabajador = ct.kilosAsignados ?? c.kilosCosechados;
                const prev = trabajadorMap.get(tId) || {
                    trabajadorId: tId,
                    nombre: `${ct.Trabajador.nombres}${ct.Trabajador.apellidos ? " " + ct.Trabajador.apellidos : ""}`,
                    dni: ct.Trabajador.dni || "",
                    kilos: 0,
                    cosechas: 0,
                };
                prev.kilos += kilosTrabajador;
                prev.cosechas += 1;
                trabajadorMap.set(tId, prev);
            }
        }

        for (const cl of c.cosechaLotes) {
            if (cl.lote) {
                const lId = cl.lote.id;
                const prev = loteMap.get(lId) || {
                    loteId: lId,
                    codigo: cl.lote.codigo,
                    nombre: cl.lote.nombre ?? null,
                    kilos: 0,
                    cosechas: 0,
                };
                prev.kilos += c.kilosCosechados;
                prev.cosechas += 1;
                loteMap.set(lId, prev);
            }
        }
    }

    const porDia = Array.from(diaMap.values());
    const porMes = Array.from(mesMap.entries()).map(([mes, kilos]) => ({ mes, kilos }));
    const porQuincena = Array.from(quincenaMap.entries()).map(([quincena, kilos]) => ({ quincena, kilos }));
    const porTipoCosecha = Array.from(tipoMap.entries()).map(([tipoCosecha, kilos]) => ({ tipoCosecha, kilos }));
    const porTrabajador = Array.from(trabajadorMap.values());
    const porLote = Array.from(loteMap.values());

    return {
        porDia,
        porMes,
        porQuincena,
        porTipoCosecha,
        porTrabajador,
        porLote,
    };
}

// ============================================================================
// CARGA MASIVA DE COSECHAS DESDE ARCHIVO EXCEL (.xlsx)
// ============================================================================

function parseFechaExcel(value: any, filaIndex: number): { fechaDate: Date; fechaKey: string } {
    if (value === null || value === undefined || String(value).trim() === "") {
        throw new Error(`Fila ${filaIndex}: El campo FECHA_COSECHA es obligatorio.`);
    }

    // 1. Si xlsx ya lo convirtió a objeto Date
    if (value instanceof Date && !isNaN(value.getTime())) {
        const yyyy = value.getUTCFullYear();
        const mm = String(value.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(value.getUTCDate()).padStart(2, "0");
        const fechaKey = `${yyyy}-${mm}-${dd}`;
        return {
            fechaDate: new Date(`${fechaKey}T12:00:00.000Z`),
            fechaKey,
        };
    }

    // 2. Si viene como número serial de fecha de Excel (ej: 45427)
    if (typeof value === "number") {
        const jsDate = new Date(Math.round((value - 25569) * 86400 * 1000));
        if (!isNaN(jsDate.getTime())) {
            const yyyy = jsDate.getUTCFullYear();
            const mm = String(jsDate.getUTCMonth() + 1).padStart(2, "0");
            const dd = String(jsDate.getUTCDate()).padStart(2, "0");
            const fechaKey = `${yyyy}-${mm}-${dd}`;
            return {
                fechaDate: new Date(`${fechaKey}T12:00:00.000Z`),
                fechaKey,
            };
        }
    }

    // 3. Si viene como string
    if (typeof value === "string") {
        const trimmed = value.trim();

        // Formato ISO YYYY-MM-DD o YYYY/MM/DD
        const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        if (isoMatch) {
            const yyyy = isoMatch[1];
            const mm = isoMatch[2].padStart(2, "0");
            const dd = isoMatch[3].padStart(2, "0");
            const fechaKey = `${yyyy}-${mm}-${dd}`;
            return {
                fechaDate: new Date(`${fechaKey}T12:00:00.000Z`),
                fechaKey,
            };
        }

        // Formato latinoamericano DD/MM/YYYY o DD-MM-YYYY
        const latamMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (latamMatch) {
            const dd = latamMatch[1].padStart(2, "0");
            const mm = latamMatch[2].padStart(2, "0");
            const yyyy = latamMatch[3];
            const fechaKey = `${yyyy}-${mm}-${dd}`;
            return {
                fechaDate: new Date(`${fechaKey}T12:00:00.000Z`),
                fechaKey,
            };
        }

        const parsed = new Date(trimmed);
        if (!isNaN(parsed.getTime())) {
            const yyyy = parsed.getFullYear();
            const mm = String(parsed.getMonth() + 1).padStart(2, "0");
            const dd = String(parsed.getDate()).padStart(2, "0");
            const fechaKey = `${yyyy}-${mm}-${dd}`;
            return {
                fechaDate: new Date(`${fechaKey}T12:00:00.000Z`),
                fechaKey,
            };
        }
    }

    throw new Error(`Fila ${filaIndex}: Formato de fecha no válido en FECHA_COSECHA ("${value}").`);
}

function parseNumero(value: any, campo: string, filaIndex: number, defaultValue: number = 0): number {
    if (value === null || value === undefined || String(value).trim() === "") {
        return defaultValue;
    }
    if (typeof value === "number") {
        if (isNaN(value)) {
            throw new Error(`Fila ${filaIndex}: El campo ${campo} no es un número válido.`);
        }
        return value;
    }
    const cleanStr = String(value).trim().replace(",", ".");
    const parsed = parseFloat(cleanStr);
    if (isNaN(parsed)) {
        throw new Error(`Fila ${filaIndex}: El valor de ${campo} ("${value}") no es un número válido.`);
    }
    return parsed;
}

export interface FilaCosechaPreview {
    filaNumero: number;
    fecha: string;
    tipoCosecha: string;
    trabajadorDni: string;
    trabajadorNombre: string | null;
    trabajadorExiste: boolean;
    kilosRecolectados: number;
    codigosLotes: string[];
    lotesValidos: { codigo: string; nombre: string | null; existe: boolean }[];
    totalHectareas: number;
    varietal: string | null;
    esValida: boolean;
    errores: string[];
}

export interface PreviewCargaMasivaResponse {
    resumen: {
        totalFilas: number;
        filasValidas: number;
        filasConError: number;
        totalKilos: number;
        gruposEstimados: number;
        trabajadoresDetectados: number;
        lotesDetectados: number;
    };
    filas: FilaCosechaPreview[];
}

export interface FilaConfirmacionInput {
    filaNumero?: number;
    fecha: string;
    tipoCosecha?: string;
    trabajadorDni: string;
    kilosRecolectados: number;
    codigosLotes: string[] | string;
    totalHectareas?: number;
    varietal?: string | null;
}

export async function previewCargaMasivaCosechas(
    buffer: Buffer
): Promise<PreviewCargaMasivaResponse> {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error("El archivo Excel no contiene hojas de trabajo.");
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) {
        throw new Error("No se pudo leer la primera hoja del archivo Excel.");
    }

    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
        defval: null,
    });

    if (!rawRows || rawRows.length === 0) {
        throw new Error("El archivo Excel está vacío o no contiene filas de datos.");
    }

    const rows = rawRows
        .map((row, index) => {
            const normalizedRow: Record<string, any> = {};
            for (const [key, value] of Object.entries(row)) {
                normalizedRow[key.trim().toUpperCase()] = value;
            }
            return {
                filaNumero: index + 2,
                data: normalizedRow,
            };
        })
        .filter(({ data }) => {
            return Object.values(data).some(
                (v) => v !== null && v !== undefined && String(v).trim() !== ""
            );
        });

    if (rows.length === 0) {
        throw new Error("El archivo Excel no contiene filas con datos válidos.");
    }

    const columnasRequeridas = [
        "FECHA_COSECHA",
        "TIPO_COSECHA",
        "IDENTIFICADOR_TRABAJADOR",
        "KILOS_RECOLECTADOS",
        "CODIGOS_LOTES",
        "TOTAL_HECTAREAS",
        "VARIETAL",
    ];

    const primeraFilaKeys = Object.keys(rows[0].data);
    const columnasFaltantes = columnasRequeridas.filter(
        (col) => !primeraFilaKeys.includes(col)
    );

    if (columnasFaltantes.length > 0) {
        throw new Error(
            `El formato del archivo es inválido. Faltan las siguientes columnas requeridas: ${columnasFaltantes.join(", ")}`
        );
    }

    const preParsedRows: {
        filaNumero: number;
        fechaDate: Date;
        fechaKey: string;
        tipoCosecha: string;
        trabajadorDni: string;
        kilosRecolectados: number;
        codigosLotes: string[];
        totalHectareas: number;
        varietal: string | null;
        errores: string[];
    }[] = [];

    const uniqueDnis = new Set<string>();
    const uniqueCodigosLotes = new Set<string>();

    for (const { filaNumero, data } of rows) {
        const errores: string[] = [];
        let fechaDate = new Date();
        let fechaKey = "";

        try {
            const resFecha = parseFechaExcel(data["FECHA_COSECHA"], filaNumero);
            fechaDate = resFecha.fechaDate;
            fechaKey = resFecha.fechaKey;
        } catch (err: any) {
            errores.push(err.message || "Fecha inválida");
        }

        const rawTipo = data["TIPO_COSECHA"];
        const tipoCosecha = normalizeTipoCosecha(rawTipo ? String(rawTipo) : undefined);

        const dniRaw = data["IDENTIFICADOR_TRABAJADOR"];
        const trabajadorDni = dniRaw !== null && dniRaw !== undefined ? String(dniRaw).trim() : "";
        if (!trabajadorDni) {
            errores.push("El campo IDENTIFICADOR_TRABAJADOR es obligatorio.");
        } else {
            uniqueDnis.add(trabajadorDni);
        }

        let kilos = 0;
        try {
            kilos = parseNumero(data["KILOS_RECOLECTADOS"], "KILOS_RECOLECTADOS", filaNumero);
            if (kilos <= 0) {
                errores.push("KILOS_RECOLECTADOS debe ser mayor a 0.");
            }
        } catch (err: any) {
            errores.push(err.message);
        }

        const codigosLotesRaw = data["CODIGOS_LOTES"];
        const codigosLotes = codigosLotesRaw
            ? String(codigosLotesRaw)
                .split(",")
                .map((c) => c.trim())
                .filter((c) => c.length > 0)
            : [];

        if (codigosLotes.length === 0) {
            errores.push("CODIGOS_LOTES debe contener al menos un lote.");
        } else {
            for (const c of codigosLotes) {
                uniqueCodigosLotes.add(c);
            }
        }

        let totalHectareas = 0;
        try {
            totalHectareas = parseNumero(data["TOTAL_HECTAREAS"], "TOTAL_HECTAREAS", filaNumero, 0);
        } catch (err: any) {
            errores.push(err.message);
        }

        const varietalRaw = data["VARIETAL"];
        const varietal = varietalRaw && String(varietalRaw).trim() !== "" ? String(varietalRaw).trim() : null;

        preParsedRows.push({
            filaNumero,
            fechaDate,
            fechaKey,
            tipoCosecha,
            trabajadorDni,
            kilosRecolectados: kilos,
            codigosLotes,
            totalHectareas,
            varietal,
            errores,
        });
    }

    const trabajadoresDb = await prisma.trabajador.findMany({
        where: {
            dni: { in: Array.from(uniqueDnis) },
        },
        select: {
            id: true,
            dni: true,
            nombres: true,
            apellidos: true,
        },
    });

    const lotesDb = await prisma.lote.findMany({
        where: {
            codigo: { in: Array.from(uniqueCodigosLotes) },
        },
        select: {
            id: true,
            codigo: true,
            nombre: true,
        },
    });

    const trabajadorMap = new Map<string, { id: number; nombreCompleto: string }>();
    for (const t of trabajadoresDb) {
        const nombreCompleto = `${t.nombres}${t.apellidos ? ` ${t.apellidos}` : ""}`;
        trabajadorMap.set(t.dni.trim(), { id: t.id, nombreCompleto });
    }

    const loteMap = new Map<string, { id: number; nombre: string | null }>();
    for (const l of lotesDb) {
        loteMap.set(l.codigo.trim(), { id: l.id, nombre: l.nombre });
    }

    const gruposUnicos = new Set<string>();
    let totalKilos = 0;
    let filasValidas = 0;
    let filasConError = 0;

    const filasPreview: FilaCosechaPreview[] = preParsedRows.map((row) => {
        const errores = [...row.errores];
        const trabajadorInfo = trabajadorMap.get(row.trabajadorDni);
        const trabajadorExiste = Boolean(trabajadorInfo);

        if (row.trabajadorDni && !trabajadorExiste) {
            errores.push(`DNI ${row.trabajadorDni} no está registrado en el sistema.`);
        }

        const lotesValidos = row.codigosLotes.map((cod) => {
            const loteInfo = loteMap.get(cod);
            const existe = Boolean(loteInfo);
            if (!existe) {
                errores.push(`Lote '${cod}' no está registrado en el sistema.`);
            }
            return {
                codigo: cod,
                nombre: loteInfo?.nombre || null,
                existe,
            };
        });

        const esValida = errores.length === 0;

        if (esValida) {
            filasValidas++;
            totalKilos += row.kilosRecolectados;
            gruposUnicos.add(`${row.fechaKey}__${row.tipoCosecha}`);
        } else {
            filasConError++;
        }

        return {
            filaNumero: row.filaNumero,
            fecha: row.fechaKey || new Date().toISOString().split("T")[0],
            tipoCosecha: row.tipoCosecha,
            trabajadorDni: row.trabajadorDni,
            trabajadorNombre: trabajadorInfo?.nombreCompleto || null,
            trabajadorExiste,
            kilosRecolectados: row.kilosRecolectados,
            codigosLotes: row.codigosLotes,
            lotesValidos,
            totalHectareas: row.totalHectareas,
            varietal: row.varietal,
            esValida,
            errores,
        };
    });

    return {
        resumen: {
            totalFilas: filasPreview.length,
            filasValidas,
            filasConError,
            totalKilos: Number(totalKilos.toFixed(2)),
            gruposEstimados: gruposUnicos.size,
            trabajadoresDetectados: uniqueDnis.size,
            lotesDetectados: uniqueCodigosLotes.size,
        },
        filas: filasPreview,
    };
}

export async function confirmarCargaMasivaCosechas(filas: FilaConfirmacionInput[]) {
    if (!filas || filas.length === 0) {
        throw new Error("No se proporcionaron filas para procesar.");
    }

    const uniqueDnis = new Set<string>();
    const uniqueCodigosLotes = new Set<string>();

    const filasValidadas: {
        fechaDate: Date;
        fechaKey: string;
        tipoCosecha: string;
        trabajadorDni: string;
        kilosRecolectados: number;
        codigosLotes: string[];
        totalHectareas: number;
        varietal: string | null;
    }[] = [];

    for (let i = 0; i < filas.length; i++) {
        const fila = filas[i];
        const numFila = fila.filaNumero || i + 1;

        const { fechaDate, fechaKey } = parseFechaExcel(fila.fecha, numFila);
        const tipoCosecha = normalizeTipoCosecha(fila.tipoCosecha);

        const dni = String(fila.trabajadorDni || "").trim();
        if (!dni) {
            throw new Error(`Fila ${numFila}: IDENTIFICADOR_TRABAJADOR es obligatorio.`);
        }
        uniqueDnis.add(dni);

        const kilos = Number(fila.kilosRecolectados);
        if (isNaN(kilos) || kilos <= 0) {
            throw new Error(`Fila ${numFila}: KILOS_RECOLECTADOS debe ser mayor a 0.`);
        }

        const rawLotes = fila.codigosLotes;
        const codigosLotes = Array.isArray(rawLotes)
            ? rawLotes.map((c) => String(c).trim()).filter(Boolean)
            : String(rawLotes || "")
                .split(",")
                .map((c) => c.trim())
                .filter(Boolean);

        if (codigosLotes.length === 0) {
            throw new Error(`Fila ${numFila}: CODIGOS_LOTES es obligatorio.`);
        }

        for (const c of codigosLotes) {
            uniqueCodigosLotes.add(c);
        }

        const totalHectareas = Number(fila.totalHectareas || 0);
        const varietal = fila.varietal && String(fila.varietal).trim() !== "" ? String(fila.varietal).trim() : null;

        filasValidadas.push({
            fechaDate,
            fechaKey,
            tipoCosecha,
            trabajadorDni: dni,
            kilosRecolectados: kilos,
            codigosLotes,
            totalHectareas,
            varietal,
        });
    }

    const trabajadoresDb = await prisma.trabajador.findMany({
        where: {
            dni: { in: Array.from(uniqueDnis) },
        },
        select: {
            id: true,
            dni: true,
        },
    });

    const lotesDb = await prisma.lote.findMany({
        where: {
            codigo: { in: Array.from(uniqueCodigosLotes) },
        },
        select: {
            id: true,
            codigo: true,
        },
    });

    const trabajadorMap = new Map<string, number>();
    for (const t of trabajadoresDb) {
        trabajadorMap.set(t.dni.trim(), t.id);
    }

    const loteMap = new Map<string, number>();
    for (const l of lotesDb) {
        loteMap.set(l.codigo.trim(), l.id);
    }

    const dnisFaltantes: string[] = [];
    for (const dni of uniqueDnis) {
        if (!trabajadorMap.has(dni)) {
            dnisFaltantes.push(dni);
        }
    }

    const codigosLotesFaltantes: string[] = [];
    for (const codigo of uniqueCodigosLotes) {
        if (!loteMap.has(codigo)) {
            codigosLotesFaltantes.push(codigo);
        }
    }

    if (dnisFaltantes.length > 0 || codigosLotesFaltantes.length > 0) {
        const errorDetails: string[] = [];
        if (dnisFaltantes.length > 0) {
            errorDetails.push(
                `Los siguientes DNI de trabajadores no existen en la base de datos: [${dnisFaltantes.join(", ")}]`
            );
        }
        if (codigosLotesFaltantes.length > 0) {
            errorDetails.push(
                `Los siguientes códigos de lote no existen en la base de datos: [${codigosLotesFaltantes.join(", ")}]`
            );
        }
        throw new Error(`Carga masiva abortada: ${errorDetails.join(". ")}`);
    }

    interface GrupoCosecha {
        fecha: Date;
        fechaKey: string;
        tipoCosecha: string;
        filas: {
            trabajadorId: number;
            kilosRecolectados: number;
            loteIds: number[];
            codigosLotes: string[];
            totalHectareas: number;
            varietal: string | null;
        }[];
    }

    const grupos = new Map<string, GrupoCosecha>();

    for (const fila of filasValidadas) {
        const trabajadorId = trabajadorMap.get(fila.trabajadorDni)!;
        const loteIds = fila.codigosLotes.map((codigo) => loteMap.get(codigo)!);

        const groupKey = `${fila.fechaKey}__${fila.tipoCosecha}`;

        let grupo = grupos.get(groupKey);
        if (!grupo) {
            grupo = {
                fecha: fila.fechaDate,
                fechaKey: fila.fechaKey,
                tipoCosecha: fila.tipoCosecha,
                filas: [],
            };
            grupos.set(groupKey, grupo);
        }

        grupo.filas.push({
            trabajadorId,
            kilosRecolectados: fila.kilosRecolectados,
            loteIds,
            codigosLotes: fila.codigosLotes,
            totalHectareas: fila.totalHectareas,
            varietal: fila.varietal,
        });
    }

    const cosechasCreadas = [];

    for (const grupo of grupos.values()) {
        const totalKilos = grupo.filas.reduce((acc, f) => acc + f.kilosRecolectados, 0);

        const codigosLotesUnicos = Array.from(
            new Set(grupo.filas.flatMap((f) => f.codigosLotes))
        );
        const lotesTexto = codigosLotesUnicos.join(", ");

        const totalHectareas = Math.max(
            ...grupo.filas.map((f) => f.totalHectareas),
            0
        );
        const varietal = grupo.filas.find((f) => f.varietal)?.varietal || null;

        const cosecha = await prisma.$transaction(async (tx) => {
            const nuevaCosecha = await tx.cosecha.create({
                data: {
                    fecha: grupo.fecha,
                    kilosCosechados: Number(totalKilos.toFixed(2)),
                    lotes: lotesTexto,
                    totalHectareas: Number(totalHectareas.toFixed(2)),
                    tipoCosecha: grupo.tipoCosecha,
                    varietal,
                },
            });

            const trabajadorKilosMap = new Map<number, number>();
            for (const f of grupo.filas) {
                const actual = trabajadorKilosMap.get(f.trabajadorId) || 0;
                trabajadorKilosMap.set(f.trabajadorId, actual + f.kilosRecolectados);
            }

            const registrosTrabajadores = Array.from(trabajadorKilosMap.entries()).map(
                ([trabajadorId, kilosAsignados]) => ({
                    cosechaId: nuevaCosecha.id,
                    trabajadorId,
                    kilosAsignados: Number(kilosAsignados.toFixed(2)),
                })
            );

            if (registrosTrabajadores.length > 0) {
                await tx.cosechaTrabajador.createMany({
                    data: registrosTrabajadores,
                });
            }

            const loteIdsUnicos = Array.from(
                new Set(grupo.filas.flatMap((f) => f.loteIds))
            );

            if (loteIdsUnicos.length > 0) {
                await tx.cosechaLote.createMany({
                    data: loteIdsUnicos.map((loteId) => ({
                        cosechaId: nuevaCosecha.id,
                        loteId,
                    })),
                    skipDuplicates: true,
                });
            }

            return tx.cosecha.findUnique({
                where: { id: nuevaCosecha.id },
                include: {
                    CosechaTrabajador: {
                        include: {
                            Trabajador: true,
                        },
                    },
                    cosechaLotes: {
                        include: {
                            lote: true,
                        },
                    },
                },
            });
        });

        if (cosecha) {
            cosechasCreadas.push(cosecha);
        }
    }

    return {
        totalFilasProcesadas: filasValidadas.length,
        totalGruposCreados: cosechasCreadas.length,
        cosechas: cosechasCreadas,
    };
}

export async function procesarCargaMasivaCosechas(buffer: Buffer) {
    const preview = await previewCargaMasivaCosechas(buffer);

    if (preview.resumen.filasConError > 0) {
        const errorDetails = preview.filas
            .filter((f) => !f.esValida)
            .map((f) => `Fila ${f.filaNumero}: ${f.errores.join("; ")}`)
            .join(". ");
        throw new Error(`Validación fallida: ${errorDetails}`);
    }

    return confirmarCargaMasivaCosechas(preview.filas);
}


