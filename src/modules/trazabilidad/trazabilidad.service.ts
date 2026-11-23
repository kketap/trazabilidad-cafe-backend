// src/modules/trazabilidad/trazabilidad.service.ts
import { TipoProceso } from "@prisma/client";

import { prisma } from "../../config/prisma";

/**
 * Datos aceptados para crear un proceso.
 *
 * kilosResultantes es obligatorio para registros nuevos, aunque la columna
 * permanezca nullable en Prisma para conservar procesos históricos.
 */
type ProcesoInput = {
    fecha: string;

    fechaInicio?: string | null;
    fechaFin?: string | null;

    duracionHoras?: number;

    loteId?: number | null; // Solo compatibilidad anterior
    lotes?: { loteId: number; kilosUsados: number }[];
    cosechaId?: number | null;

    etapa?: string | null;

    tipoProceso?:
    | TipoProceso
    | string
    | null;

    kilosIngresados: number;
    kilosResultantes?: number | null;
    inicioOxidacion?: string | Date | null;
    finOxidacion?: string | Date | null;
    tanqueOxidacion?: string | null;

    codigo?: string;

    gradosBrix?: number | null;
    nivelPh?: number | null;

    tempMaxima?: number | null;
    tempMinima?: number | null;

    tanqueFermentacion?: string | null;

    inicioFermentacion?:
    | string
    | Date
    | null;

    finFermentacion?:
    | string
    | Date
    | null;

    fueDespulpado?: boolean | null;
    fueLavado?: boolean | null;
};

type ResumenFiltros = {
    desde?: Date;
    hasta?: Date;
};

/**
 * Relaciones devueltas junto con cada proceso.
 *
 * La relación se llama "Lote" porque así está definida actualmente
 * en schema.prisma.
 */
const procesoInclude = {
    cosecha: true,
    procesoLotes: { include: { lote: true } },

    Lote: {
        include: {
            cosechaLotes: {
                include: {
                    cosecha: true,
                },
            },
        },
    },
};

/**
 * Calcula la duración entre dos fechas en horas.
 *
 * El resultado se redondea a dos decimales para mantener
 * consistencia con el frontend.
 *
 * Ejemplo:
 * 50 h 52 min -> 50.87
 */
function calculateDurationHours(
    start?: string | Date | null,
    end?: string | Date | null,
    fallback = 0,
): number {
    if (start && end) {
        const startTime =
            new Date(start).getTime();

        const endTime =
            new Date(end).getTime();

        const difference =
            endTime - startTime;

        if (difference > 0) {
            const horas =
                difference /
                (1000 * 60 * 60);

            return Number(
                horas.toFixed(2),
            );
        }
    }

    return fallback;
}

function getFechaKey(
    value: string | Date,
): string {
    const fecha =
        value instanceof Date
            ? value
            : new Date(value);

    const year =
        fecha.getFullYear();

    const month =
        String(
            fecha.getMonth() + 1,
        ).padStart(2, "0");

    const day =
        String(
            fecha.getDate(),
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getDateRange(
    fecha: Date,
) {
    const desde =
        new Date(fecha);

    desde.setHours(
        0,
        0,
        0,
        0,
    );

    const hasta =
        new Date(desde);

    hasta.setDate(
        hasta.getDate() + 1,
    );

    return {
        desde,
        hasta,
    };
}

function buildProcesoCode(
    fecha: Date,
    correlativo: number,
): string {
    const year =
        fecha.getFullYear();

    const month =
        String(
            fecha.getMonth() + 1,
        ).padStart(2, "0");

    const day =
        String(
            fecha.getDate(),
        ).padStart(2, "0");

    return `PRO-${year}${month}${day}-${String(
        correlativo,
    ).padStart(4, "0")}`;
}

function normalizeTipoProceso(
    tipoProceso?:
        | TipoProceso
        | string
        | null,
): TipoProceso | null {
    if (!tipoProceso) {
        return null;
    }

    if (
        !Object.values(
            TipoProceso,
        ).includes(
            tipoProceso as TipoProceso,
        )
    ) {
        throw new Error(
            "El tipo de proceso no es válido",
        );
    }

    return tipoProceso as TipoProceso;
}

function parseFecha(
    value: string,
    nombreCampo: string,
): Date {
    const fecha =
        new Date(value);

    if (
        Number.isNaN(
            fecha.getTime(),
        )
    ) {
        throw new Error(
            `${nombreCampo} no es válida`,
        );
    }

    return fecha;
}

/**
 * Convierte de forma segura una fecha opcional.
 */
function parseFechaOpcional(
    value: string | Date | null | undefined,
    nombreCampo: string,
): Date | null {
    if (
        value === undefined ||
        value === null
    ) {
        return null;
    }

    const fecha =
        value instanceof Date
            ? new Date(
                value.getTime(),
            )
            : new Date(value);

    if (
        Number.isNaN(
            fecha.getTime(),
        )
    ) {
        throw new Error(
            `${nombreCampo} no es válida`,
        );
    }

    return fecha;
}

/**
 * Valida el rango temporal de fermentación.
 */
function validarRangoFermentacion(
    inicio: Date | null,
    fin: Date | null,
): void {
    if (
        inicio &&
        fin &&
        fin.getTime() <=
        inicio.getTime()
    ) {
        throw new Error(
            "El fin de fermentación debe ser posterior al inicio",
        );
    }
}

/**
 * Valida la relación entre kilos ingresados y kilos resultantes.
 *
 * La merma no se almacena: se calcula cuando se necesita mostrar
 * o resumir la información.
 */
function validarKilos(
    kilosIngresados: number,
    kilosResultantes:
        | number
        | null,
): void {
    if (
        !Number.isFinite(
            kilosIngresados,
        ) ||
        kilosIngresados <= 0
    ) {
        throw new Error(
            "Los kilos ingresados deben ser mayores que cero",
        );
    }

    /*
     * Se permite null solamente para conservar registros históricos.
     * Los procesos nuevos siempre deben enviar kilosResultantes.
     */
    if (
        kilosResultantes === null
    ) {
        return;
    }

    if (
        !Number.isFinite(
            kilosResultantes,
        ) ||
        kilosResultantes < 0
    ) {
        throw new Error(
            "Los kilos resultantes deben ser iguales o mayores que cero",
        );
    }

    if (
        kilosResultantes >
        kilosIngresados
    ) {
        throw new Error(
            "Los kilos resultantes no pueden superar los kilos ingresados",
        );
    }
}

/**
 * Valida el contrato de lotes y calcula la suma por lote.
 * No modifica los saldos de inventario (comportamiento actual del módulo).
 */
function normalizarDistribucionLotes(
    valores: { loteId: number; kilosUsados: number }[],
): { loteId: number; kilosUsados: number }[] {
    if (!Array.isArray(valores) || valores.length === 0) {
        throw new Error("Seleccione al menos un lote de origen");
    }
    const vistos = new Set<number>();
    return valores.map((item, index) => {
        const loteId = Number(item?.loteId);
        const kilosUsados = Number(item?.kilosUsados);
        if (!Number.isSafeInteger(loteId) || loteId <= 0) {
            throw new Error(`Lote inválido en la posición ${index + 1}`);
        }
        if (vistos.has(loteId)) {
            throw new Error(`El lote ${loteId} está duplicado`);
        }
        if (!Number.isFinite(kilosUsados) || kilosUsados <= 0) {
            throw new Error(`Los kilos del lote ${loteId} deben ser mayores que cero`);
        }
        vistos.add(loteId);
        return { loteId, kilosUsados };
    });
}

function sumaDistribucion(
    distribucion: { loteId: number; kilosUsados: number }[],
): number {
    return Math.round(distribucion.reduce((suma, r) => suma + r.kilosUsados, 0) * 100) / 100;
}

async function validarDistribucionContraLotes(
    distribucion: { loteId: number; kilosUsados: number }[],
    conservarInactivos: Set<number> = new Set(),
) {
    const registros = await prisma.lote.findMany({
        where: { id: { in: distribucion.map((x) => x.loteId) } },
        select: {
            id: true,
            codigo: true,
            activo: true,
            kilosActuales: true,
            kilosIniciales: true,
        },
    });
    const porId = new Map(registros.map((r) => [r.id, r]));
    for (const item of distribucion) {
        const lote = porId.get(item.loteId);
        if (!lote) throw new Error(`No existe el lote ${item.loteId}`);
        if (!lote.activo && !conservarInactivos.has(lote.id)) {
            throw new Error(`El lote ${lote.codigo} se encuentra inactivo`);
        }
        const disponible = lote.kilosActuales ?? lote.kilosIniciales;
        // Los procesos actualmente no descuentan kilosActuales: no se añade
        // el consumo anterior del proceso durante la edición.
        if (disponible != null && item.kilosUsados > disponible + 0.00001) {
            throw new Error(`El lote ${lote.codigo} solo tiene ${disponible} kg disponibles`);
        }
    }
}

export async function listarProcesos() {
    return prisma.procesoTrazabilidad.findMany({
        include:
            procesoInclude,

        orderBy: {
            fecha: "desc",
        },
    });
}

function prepararOxidacion(
    data: Pick<ProcesoInput, "inicioOxidacion" | "finOxidacion" | "tanqueOxidacion">,
    anterior?: { inicioOxidacion: Date | null; finOxidacion: Date | null; tanqueOxidacion: string | null },
) {
    const inicioOxidacion = data.inicioOxidacion === undefined ? anterior?.inicioOxidacion ?? null
        : parseFechaOpcional(data.inicioOxidacion, "Inicio de oxidación");
    const finOxidacion = data.finOxidacion === undefined ? anterior?.finOxidacion ?? null
        : parseFechaOpcional(data.finOxidacion, "Fin de oxidación");
    if (finOxidacion && (!inicioOxidacion || finOxidacion <= inicioOxidacion)) {
        throw new Error("El fin de oxidación debe ser posterior al inicio");
    }
    return {
        inicioOxidacion, finOxidacion,
        tanqueOxidacion: data.tanqueOxidacion === undefined ? anterior?.tanqueOxidacion ?? null
            : data.tanqueOxidacion?.trim() || null,
    };
}

export async function crearProceso(
    data: ProcesoInput,
) {
    const kilosIngresados =
        Number(
            data.kilosIngresados,
        );

    const kilosResultantes = data.kilosResultantes == null ? null : Number(data.kilosResultantes);
    const oxidacion = prepararOxidacion(data);

    validarKilos(
        kilosIngresados,
        kilosResultantes,
    );

    const fecha =
        parseFecha(
            data.fecha,
            "La fecha del proceso",
        );

    /*
     * Fechas históricas / generales del proceso.
     * Se conservan para compatibilidad.
     */
    const fechaInicio =
        data.fechaInicio
            ? parseFecha(
                data.fechaInicio,
                "La fecha de inicio",
            )
            : null;

    const fechaFin =
        data.fechaFin
            ? parseFecha(
                data.fechaFin,
                "La fecha de término",
            )
            : null;

    if (
        fechaInicio &&
        fechaFin &&
        fechaFin.getTime() <=
        fechaInicio.getTime()
    ) {
        throw new Error(
            "La fecha de término debe ser posterior a la fecha de inicio",
        );
    }

    /*
     * Fechas reales de fermentación.
     */
    const inicioFermentacion =
        parseFechaOpcional(
            data.inicioFermentacion,
            "La fecha de inicio de fermentación",
        );

    const finFermentacion =
        parseFechaOpcional(
            data.finFermentacion,
            "La fecha de fin de fermentación",
        );

    validarRangoFermentacion(
        inicioFermentacion,
        finFermentacion,
    );

    /*
     * La duración se calcula prioritariamente
     * desde inicioFermentacion y finFermentacion.
     *
     * Para registros antiguos que no tengan ambas fechas,
     * se conserva el cálculo anterior usando fechaInicio /
     * fechaFin o, finalmente, duracionHoras recibido.
     */
    const duracionHoras =
        inicioFermentacion &&
            finFermentacion
            ? calculateDurationHours(
                inicioFermentacion,
                finFermentacion,
            )
            : calculateDurationHours(
                fechaInicio,
                fechaFin,
                data.duracionHoras !==
                    undefined
                    ? Number(
                        data.duracionHoras,
                    )
                    : 0,
            );

    if (
        !Number.isFinite(
            duracionHoras,
        ) ||
        duracionHoras < 0
    ) {
        throw new Error(
            "La duración del proceso no es válida",
        );
    }

    const tipoProceso =
        normalizeTipoProceso(
            data.tipoProceso,
        );

    let cosechaIdFinal =
        data.cosechaId !==
            undefined &&
            data.cosechaId !== null
            ? Number(
                data.cosechaId,
            )
            : null;

    // Se acepta el contrato moderno `lotes` y el antiguo `loteId`.
    if (data.lotes !== undefined && data.loteId != null) {
        throw new Error("Envíe 'lotes' o 'loteId', pero no ambos");
    }
    const distribucion = normalizarDistribucionLotes(
        data.lotes !== undefined
            ? data.lotes
            : data.loteId != null
                ? [{ loteId: data.loteId, kilosUsados: kilosIngresados }]
                : [],
    );
    const suma = sumaDistribucion(distribucion);
    if (Math.abs(suma - kilosIngresados) > 0.01) {
        throw new Error("kilosIngresados no coincide con la suma de lotes[].kilosUsados");
    }
    await validarDistribucionContraLotes(distribucion);
    // Para procesos nuevos manda la tabla intermedia; se mantiene nulo el
    // campo legado que solo identifica un lote, para no generar ambigüedad.
    const loteIdFinal: number | null = distribucion.length === 1 ? distribucion[0].loteId : null;

    return prisma.$transaction(
        async (tx) => {
            let codigo =
                data.codigo?.trim();

            if (!codigo) {
                const {
                    desde,
                    hasta,
                } =
                    getDateRange(
                        fecha,
                    );

                const cantidadProcesosDia =
                    await tx.procesoTrazabilidad.count(
                        {
                            where: {
                                fecha: {
                                    gte: desde,
                                    lt: hasta,
                                },
                            },
                        },
                    );

                let correlativo =
                    cantidadProcesosDia +
                    1;

                codigo =
                    buildProcesoCode(
                        fecha,
                        correlativo,
                    );

                /*
                 * Evita una colisión si hubo eliminaciones o creaciones
                 * concurrentes que dejaron ocupado el correlativo calculado.
                 */
                while (
                    await tx.procesoTrazabilidad.findUnique(
                        {
                            where: {
                                codigo,
                            },

                            select: {
                                id: true,
                            },
                        },
                    )
                ) {
                    correlativo += 1;

                    codigo =
                        buildProcesoCode(
                            fecha,
                            correlativo,
                        );
                }
            }

        return tx.procesoTrazabilidad.create({
            data: {
                codigo,
                fecha,
                fechaInicio,
                fechaFin,
                duracionHoras,
                ...oxidacion,
                etapa: data.etapa?.trim() || null,
                tipoProceso,
                kilosIngresados,
                kilosResultantes:
                    data.kilosResultantes !== undefined && data.kilosResultantes !== null
                        ? Number(data.kilosResultantes)
                        : null,
                loteId: loteIdFinal,
                procesoLotes: { create: distribucion.map(({ loteId, kilosUsados }) => ({ loteId, kilosUsados })) },
                cosechaId: cosechaIdFinal,
                gradosBrix:
                    data.gradosBrix !== undefined && data.gradosBrix !== null
                        ? Number(data.gradosBrix)
                        : null,
                nivelPh:
                    data.nivelPh !== undefined && data.nivelPh !== null
                        ? Number(data.nivelPh)
                        : null,
                tempMaxima:
                    data.tempMaxima !== undefined && data.tempMaxima !== null
                        ? Number(data.tempMaxima)
                        : null,
                tempMinima:
                    data.tempMinima !== undefined && data.tempMinima !== null
                        ? Number(data.tempMinima)
                        : null,
                tanqueFermentacion: data.tanqueFermentacion?.trim() || null,
                inicioFermentacion: data.inicioFermentacion
                    ? new Date(data.inicioFermentacion)
                    : null,
                finFermentacion: data.finFermentacion
                    ? new Date(data.finFermentacion)
                    : null,
                fueDespulpado:
                    data.fueDespulpado !== undefined && data.fueDespulpado !== null
                        ? Boolean(data.fueDespulpado)
                        : null,
                fueLavado:
                    data.fueLavado !== undefined && data.fueLavado !== null
                        ? Boolean(data.fueLavado)
                        : null,
            },
            include: procesoInclude,
        });
    });
}

export async function actualizarProceso(
    id: number,
    data: Partial<ProcesoInput>,
) {
    const procesoActual =
        await prisma.procesoTrazabilidad.findUnique({
            where: { id },
            include: { procesoLotes: true },
        });

    if (!procesoActual) {
        throw new Error(
            "Proceso no encontrado",
        );
    }

    /*
     * Se calculan los valores finales porque modificar kilosIngresados
     * también puede volver inválido el kilosResultantes que ya existía.
     */
    const cambiandoLotes = data.lotes !== undefined || data.loteId !== undefined;
    if (data.lotes !== undefined && data.loteId != null) {
        throw new Error("Envíe 'lotes' o 'loteId', pero no ambos");
    }
    const distribucion = cambiandoLotes
        ? normalizarDistribucionLotes(
            data.lotes !== undefined
                ? data.lotes
                : data.loteId != null
                    ? [{
                        loteId: data.loteId,
                        kilosUsados: Number(data.kilosIngresados ?? procesoActual.kilosIngresados),
                    }]
                    : [],
          )
        : undefined;

    const kilosIngresadosFinal = distribucion
        ? sumaDistribucion(distribucion)
        : data.kilosIngresados !== undefined
            ? Number(data.kilosIngresados)
            : procesoActual.kilosIngresados;

    if (distribucion) {
        if (data.kilosIngresados !== undefined &&
            Math.abs(Number(data.kilosIngresados) - kilosIngresadosFinal) > 0.01) {
            throw new Error("kilosIngresados no coincide con la suma de lotes[].kilosUsados");
        }
        const idsConservados = new Set(procesoActual.procesoLotes.map((x) => x.loteId));
        if (procesoActual.loteId != null) idsConservados.add(procesoActual.loteId);
        await validarDistribucionContraLotes(distribucion, idsConservados);
    } else if (data.kilosIngresados !== undefined && procesoActual.procesoLotes.length) {
        const sumaActual = sumaDistribucion(procesoActual.procesoLotes);
        if (Math.abs(sumaActual - kilosIngresadosFinal) > 0.01) {
            throw new Error("Para modificar kilosIngresados debe enviar la distribución 'lotes'");
        }
    } else if (data.kilosIngresados !== undefined && procesoActual.loteId != null) {
        await validarDistribucionContraLotes(
            [{ loteId: procesoActual.loteId, kilosUsados: kilosIngresadosFinal }],
            new Set([procesoActual.loteId]),
        );
    }

    const kilosResultantesFinal = data.kilosResultantes !== undefined
        ? data.kilosResultantes === null
            ? null
            : Number(data.kilosResultantes)
        : procesoActual.kilosResultantes;

    validarKilos(
        Number(
            kilosIngresadosFinal,
        ),

        kilosResultantesFinal !==
            null
            ? Number(
                kilosResultantesFinal,
            )
            : null,
    );

    const fecha =
        data.fecha !== undefined
            ? parseFecha(
                data.fecha,
                "La fecha del proceso",
            )
            : undefined;

    /*
     * Fechas generales / históricas.
     */
    const fechaInicio =
        data.fechaInicio !==
            undefined
            ? data.fechaInicio
                ? parseFecha(
                    data.fechaInicio,
                    "La fecha de inicio",
                )
                : null
            : undefined;

    const fechaFin =
        data.fechaFin !==
            undefined
            ? data.fechaFin
                ? parseFecha(
                    data.fechaFin,
                    "La fecha de término",
                )
                : null
            : undefined;

    const fechaInicioFinal =
        fechaInicio !==
            undefined
            ? fechaInicio
            : procesoActual.fechaInicio;

    const fechaFinFinal =
        fechaFin !== undefined
            ? fechaFin
            : procesoActual.fechaFin;

    if (
        fechaInicioFinal &&
        fechaFinFinal &&
        fechaFinFinal.getTime() <=
        fechaInicioFinal.getTime()
    ) {
        throw new Error(
            "La fecha de término debe ser posterior a la fecha de inicio",
        );
    }

    /*
     * Fechas de fermentación enviadas en esta actualización.
     */
    let inicioFermentacion:
        | Date
        | null
        | undefined;

    if (
        data.inicioFermentacion !==
        undefined
    ) {
        inicioFermentacion =
            data.inicioFermentacion ===
                null
                ? null
                : parseFechaOpcional(
                    data.inicioFermentacion,
                    "La fecha de inicio de fermentación",
                );
    }

    let finFermentacion:
        | Date
        | null
        | undefined;

    if (
        data.finFermentacion !==
        undefined
    ) {
        finFermentacion =
            data.finFermentacion ===
                null
                ? null
                : parseFechaOpcional(
                    data.finFermentacion,
                    "La fecha de fin de fermentación",
                );
    }

    /*
     * Valores finales después de combinar lo enviado
     * con lo que ya existe en la base.
     */
    const inicioFermentacionFinal =
        inicioFermentacion !==
            undefined
            ? inicioFermentacion
            : procesoActual.inicioFermentacion;

    const finFermentacionFinal =
        finFermentacion !==
            undefined
            ? finFermentacion
            : procesoActual.finFermentacion;

    validarRangoFermentacion(
        inicioFermentacionFinal,
        finFermentacionFinal,
    );

    let duracionHoras:
        | number
        | undefined;

    /*
     * Si existen ambas fechas de fermentación,
     * ellas siempre son la fuente oficial de la duración.
     */
    if (
        inicioFermentacionFinal &&
        finFermentacionFinal
    ) {
        duracionHoras =
            calculateDurationHours(
                inicioFermentacionFinal,
                finFermentacionFinal,
            );
    }

    /*
     * Compatibilidad con procesos antiguos que todavía
     * solamente utilizan fechaInicio / fechaFin.
     */
    else if (
        data.fechaInicio !==
        undefined ||
        data.fechaFin !== undefined
    ) {
        duracionHoras =
            calculateDurationHours(
                fechaInicioFinal,
                fechaFinFinal,

                data.duracionHoras !==
                    undefined
                    ? Number(
                        data.duracionHoras,
                    )
                    : procesoActual.duracionHoras,
            );
    }

    /*
     * Último fallback para registros antiguos.
     */
    else if (
        data.duracionHoras !==
        undefined
    ) {
        duracionHoras =
            Number(
                data.duracionHoras,
            );
    }

    if (
        duracionHoras !==
        undefined &&
        (
            !Number.isFinite(
                duracionHoras,
            ) ||
            duracionHoras < 0
        )
    ) {
        throw new Error(
            "La duración del proceso no es válida",
        );
    }

    const tipoProceso =
        data.tipoProceso !==
            undefined
            ? normalizeTipoProceso(
                data.tipoProceso,
            )
            : undefined;

    // Si la edición suministra lotes, se reemplaza la relación legada.
    // Sin cambio de lotes, se conserva todo el historial existente.
    const loteIdFinal = distribucion
        ? distribucion.length === 1 ? distribucion[0].loteId : null
        : procesoActual.loteId;

    return prisma.procesoTrazabilidad.update({
        where: {
            id,
        },

        data: {
            ...(fecha !==
                undefined && {
                fecha,
            }),

            ...(cambiandoLotes && {
                loteId: loteIdFinal,
                procesoLotes: {
                    deleteMany: {},
                    create: (distribucion ?? []).map(({ loteId, kilosUsados }) => ({
                        loteId,
                        kilosUsados,
                    })),
                },
            }),

            ...(data.cosechaId !==
                undefined && {
                cosechaId:
                    data.cosechaId !==
                        null
                        ? Number(
                            data.cosechaId,
                        )
                        : null,
            }),

            ...prepararOxidacion(data, procesoActual),
            ...(data.etapa !==
                undefined && {
                etapa:
                    data.etapa?.trim() ||
                    null,
            }),

            ...(tipoProceso !==
                undefined && {
                tipoProceso,
            }),

            ...((data.kilosIngresados !== undefined || cambiandoLotes) && {
                kilosIngresados: kilosIngresadosFinal,
            }),
            ...(data.kilosResultantes !== undefined && {
                kilosResultantes:
                    data.kilosResultantes !== null
                        ? Number(data.kilosResultantes)
                        : null,
            }),
            ...(data.codigo !== undefined && {
                codigo: data.codigo.trim(),
            }),

            /*
             * Si existen fechas de fermentación,
             * duracionHoras fue recalculada por backend.
             */
            ...(duracionHoras !==
                undefined && {
                duracionHoras,
            }),

            ...(fechaInicio !==
                undefined && {
                fechaInicio,
            }),

            ...(fechaFin !==
                undefined && {
                fechaFin,
            }),

            ...(data.gradosBrix !==
                undefined && {
                gradosBrix:
                    data.gradosBrix !==
                        null
                        ? Number(
                            data.gradosBrix,
                        )
                        : null,
            }),

            ...(data.nivelPh !==
                undefined && {
                nivelPh:
                    data.nivelPh !==
                        null
                        ? Number(
                            data.nivelPh,
                        )
                        : null,
            }),

            ...(data.tempMaxima !==
                undefined && {
                tempMaxima:
                    data.tempMaxima !==
                        null
                        ? Number(
                            data.tempMaxima,
                        )
                        : null,
            }),

            ...(data.tempMinima !==
                undefined && {
                tempMinima:
                    data.tempMinima !==
                        null
                        ? Number(
                            data.tempMinima,
                        )
                        : null,
            }),

            ...(data.tanqueFermentacion !==
                undefined && {
                tanqueFermentacion:
                    data.tanqueFermentacion !==
                        null
                        ? data.tanqueFermentacion.trim()
                        : null,
            }),

            /*
             * Utilizamos las fechas parseadas anteriormente,
             * evitando convertirlas otra vez.
             */
            ...(inicioFermentacion !==
                undefined && {
                inicioFermentacion,
            }),

            ...(finFermentacion !==
                undefined && {
                finFermentacion,
            }),

            ...(data.fueDespulpado !==
                undefined && {
                fueDespulpado:
                    data.fueDespulpado !==
                        null
                        ? Boolean(
                            data.fueDespulpado,
                        )
                        : null,
            }),

            ...(data.fueLavado !==
                undefined && {
                fueLavado:
                    data.fueLavado !==
                        null
                        ? Boolean(
                            data.fueLavado,
                        )
                        : null,
            }),
        },

        include:
            procesoInclude,
    });
}

export async function eliminarProceso(
    id: number,
) {
    return prisma.procesoTrazabilidad.delete({
        where: {
            id,
        },
    });
}

export async function obtenerResumenTrazabilidad(
    filtros: ResumenFiltros = {},
) {
    const procesos =
        await prisma.procesoTrazabilidad.findMany(
            {
                where: {
                    ...(filtros.desde ||
                        filtros.hasta
                        ? {
                            fecha: {
                                ...(filtros.desde && {
                                    gte:
                                        filtros.desde,
                                }),

                                ...(filtros.hasta && {
                                    lt:
                                        filtros.hasta,
                                }),
                            },
                        }
                        : {}),
                },

                select: {
                    kilosIngresados:
                        true,

                    kilosResultantes:
                        true,
                },
            },
        );

    const totalIngresado =
        procesos.reduce(
            (
                total,
                proceso,
            ) =>
                total +
                Number(
                    proceso.kilosIngresados,
                ),

            0,
        );

    /*
     * Los procesos históricos sin kilosResultantes no participan en
     * el total resultante ni en el cálculo de merma.
     */
    const procesosConResultado =
        procesos.filter(
            (
                proceso,
            ): proceso is typeof proceso & {
                kilosResultantes: number;
            } =>
                proceso.kilosResultantes !==
                null,
        );

    const totalIngresadoConResultado =
        procesosConResultado.reduce(
            (
                total,
                proceso,
            ) =>
                total +
                Number(
                    proceso.kilosIngresados,
                ),

            0,
        );

    const totalResultante =
        procesosConResultado.reduce(
            (
                total,
                proceso,
            ) =>
                total +
                Number(
                    proceso.kilosResultantes,
                ),

            0,
        );

    /*
     * La merma se calcula, pero no se almacena en ProcesoTrazabilidad.
     * Se utiliza una merma global ponderada según los kilos procesados.
     */
    const mermaPromedio =
        totalIngresadoConResultado >
            0
            ? (
                (
                    totalIngresadoConResultado -
                    totalResultante
                ) /
                totalIngresadoConResultado
            ) * 100
            : 0;

    return {
        totalProcesos:
            procesos.length,

        totalIngresado,

        totalResultante,

        mermaPromedio,
    };
}