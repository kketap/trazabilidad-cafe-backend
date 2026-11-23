// src/modules/lotes-fisicos/lotes-fisicos.service.ts

import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

/* =====================================================
   TIPOS
===================================================== */

export type LoteFisicoInput = {
    codigo?: string;
    numero: number;
    fundoId: number;
    hectareas?: number | null;
    activo?: boolean;
};

export type ActualizarLoteFisicoInput =
    Partial<LoteFisicoInput>;

export type FiltrosLotesFisicos = {
    search?: string;
    fundoId?: number;
    activo?: boolean;
};

/* =====================================================
   ERRORES DE NEGOCIO
===================================================== */

export class LoteFisicoError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number = 400,
    ) {
        super(message);
        this.name = "LoteFisicoError";
    }
}

function validarId(valor: number, campo: string): number {
    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero <= 0) {
        throw new LoteFisicoError(
            `${campo} debe ser un número entero mayor que cero`,
        );
    }

    return numero;
}

function validarHectareas(
    valor: number | null | undefined,
): number | null {
    if (valor === null || valor === undefined) {
        return null;
    }

    if (
        valor === ("" as unknown as number) ||
        !Number.isFinite(Number(valor)) ||
        Number(valor) < 0
    ) {
        throw new LoteFisicoError(
            "Las hectáreas deben ser un número válido mayor o igual a cero",
        );
    }

    return Number(valor);
}

function validarCodigo(valor: string): string {
    if (typeof valor !== "string") {
        throw new LoteFisicoError(
            "El código del lote físico debe ser texto",
        );
    }

    const codigo = valor.trim().toUpperCase();

    if (!codigo) {
        throw new LoteFisicoError(
            "El código del lote físico no puede estar vacío",
        );
    }

    return codigo;
}

function validarActivo(valor: boolean): boolean {
    if (typeof valor !== "boolean") {
        throw new LoteFisicoError(
            "El campo activo debe ser verdadero o falso",
        );
    }

    return valor;
}

/* =====================================================
   VALIDAR FUNDO
===================================================== */

async function validarFundo(
    fundoId: number,
) {
    const id = validarId(fundoId, "El ID del fundo");

    const fundo = await prisma.fundo.findUnique({
        where: { id },
    });

    if (!fundo) {
        throw new LoteFisicoError(
            "El fundo seleccionado no existe",
            404,
        );
    }

    if (!fundo.activo) {
        throw new LoteFisicoError(
            `El fundo ${fundo.codigo} se encuentra inactivo`,
        );
    }

    return fundo;
}

/* =====================================================
   INCLUDE REUTILIZABLE
===================================================== */

const loteFisicoInclude = {
    fundo: true,
    _count: {
        select: {
            cosechas: true,
        },
    },
} satisfies Prisma.LoteFisicoInclude;

/* =====================================================
   LISTAR LOTES FÍSICOS
===================================================== */

export async function listarLotesFisicos(
    filtros: FiltrosLotesFisicos = {},
) {
    const where: Prisma.LoteFisicoWhereInput = {};

    if (filtros.fundoId !== undefined) {
        where.fundoId = validarId(
            filtros.fundoId,
            "El ID del fundo",
        );
    }

    if (filtros.activo !== undefined) {
        where.activo = filtros.activo;
    }

    const search = filtros.search?.trim();

    if (search) {
        const numeroBuscado = Number(search);

        where.OR = [
            {
                codigo: {
                    contains: search,
                    mode: "insensitive",
                },
            },
            {
                fundo: {
                    is: {
                        codigo: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                },
            },
            {
                fundo: {
                    is: {
                        nombre: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                },
            },
        ];

        if (
            Number.isInteger(numeroBuscado) &&
            numeroBuscado > 0
        ) {
            where.OR.push({
                numero: numeroBuscado,
            });
        }
    }

    return prisma.loteFisico.findMany({
        where,
        include: loteFisicoInclude,
        orderBy: [
            {
                fundo: {
                    codigo: "asc",
                },
            },
            {
                numero: "asc",
            },
        ],
    });
}

/* =====================================================
   OBTENER DETALLE
===================================================== */

export async function obtenerLoteFisicoPorId(
    id: number,
) {
    return prisma.loteFisico.findUnique({
        where: {
            id: validarId(id, "El ID del lote físico"),
        },
        include: {
            ...loteFisicoInclude,
            cosechas: {
                include: {
                    cosecha: {
                        select: {
                            id: true,
                            fecha: true,
                            kilosCosechados: true,
                            tipoCosecha: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
    });
}

/* =====================================================
   CREAR LOTE FÍSICO
===================================================== */

export async function crearLoteFisico(
    data: LoteFisicoInput,
) {
    const fundoId = validarId(
        data.fundoId,
        "El ID del fundo",
    );

    const numero = validarId(
        data.numero,
        "El número del lote físico",
    );

    const fundo = await validarFundo(fundoId);

    const codigo =
        data.codigo !== undefined
            ? validarCodigo(data.codigo)
            : `${fundo.codigo}-${numero}`.toUpperCase();

    const hectareas = validarHectareas(data.hectareas);

    const activo =
        data.activo !== undefined
            ? validarActivo(data.activo)
            : true;

    const duplicado = await prisma.loteFisico.findFirst({
        where: {
            fundoId,
            numero,
        },
        select: {
            id: true,
        },
    });

    if (duplicado) {
        throw new LoteFisicoError(
            `Ya existe el lote físico N° ${numero} en el fundo ${fundo.codigo}`,
            409,
        );
    }

    const codigoExistente =
        await prisma.loteFisico.findUnique({
            where: { codigo },
            select: { id: true },
        });

    if (codigoExistente) {
        throw new LoteFisicoError(
            `El código ${codigo} ya está registrado`,
            409,
        );
    }

    return prisma.loteFisico.create({
        data: {
            codigo,
            numero,
            fundoId,
            hectareas,
            activo,
        },
        include: loteFisicoInclude,
    });
}

/* =====================================================
   ACTUALIZAR LOTE FÍSICO
===================================================== */

export async function actualizarLoteFisico(
    id: number,
    data: ActualizarLoteFisicoInput,
) {
    const loteId = validarId(
        id,
        "El ID del lote físico",
    );

    const actual = await prisma.loteFisico.findUnique({
        where: { id: loteId },
        include: loteFisicoInclude,
    });

    if (!actual) {
        throw new LoteFisicoError(
            "Lote físico no encontrado",
            404,
        );
    }

    const fundoId =
        data.fundoId !== undefined
            ? validarId(data.fundoId, "El ID del fundo")
            : actual.fundoId;

    const numero =
        data.numero !== undefined
            ? validarId(
                data.numero,
                "El número del lote físico",
            )
            : actual.numero;

    const cambiaIdentidad =
        fundoId !== actual.fundoId ||
        numero !== actual.numero;

    /*
     * No permitir mover o renumerar lotes
     * con cosechas históricas asociadas.
     */
    if (cambiaIdentidad && actual._count.cosechas > 0) {
        throw new LoteFisicoError(
            "No se puede cambiar el fundo o número de un lote físico con cosechas asociadas. Puede modificar sus hectáreas o estado.",
            409,
        );
    }

    const fundo =
        fundoId !== actual.fundoId
            ? await validarFundo(fundoId)
            : actual.fundo;

    if (cambiaIdentidad) {
        const duplicado = await prisma.loteFisico.findFirst({
            where: {
                fundoId,
                numero,
                id: {
                    not: loteId,
                },
            },
            select: { id: true },
        });

        if (duplicado) {
            throw new LoteFisicoError(
                `Ya existe el lote físico N° ${numero} en el fundo ${fundo.codigo}`,
                409,
            );
        }
    }

    /*
     * Si cambia fundo/número, el código se
     * regenera cuando no se envía uno explícito.
     */
    const codigo =
        data.codigo !== undefined
            ? validarCodigo(data.codigo)
            : cambiaIdentidad
                ? `${fundo.codigo}-${numero}`.toUpperCase()
                : actual.codigo;

    /*
     * También protegemos cambios directos
     * del código cuando existe historial.
     */
    if (
        codigo !== actual.codigo &&
        actual._count.cosechas > 0
    ) {
        throw new LoteFisicoError(
            "No se puede modificar el código de un lote físico con cosechas asociadas",
            409,
        );
    }

    if (codigo !== actual.codigo) {
        const codigoExistente =
            await prisma.loteFisico.findUnique({
                where: { codigo },
                select: { id: true },
            });

        if (codigoExistente && codigoExistente.id !== loteId) {
            throw new LoteFisicoError(
                `El código ${codigo} ya está registrado`,
                409,
            );
        }
    }

    const hectareas =
        data.hectareas !== undefined
            ? validarHectareas(data.hectareas)
            : actual.hectareas;

    const activo =
        data.activo !== undefined
            ? validarActivo(data.activo)
            : actual.activo;

    /*
     * Impedir reactivar dentro de un fundo inactivo.
     */
    if (activo && !fundo.activo) {
        throw new LoteFisicoError(
            "No se puede activar el lote físico porque su fundo está inactivo",
        );
    }

    return prisma.loteFisico.update({
        where: {
            id: loteId,
        },
        data: {
            codigo,
            numero,
            fundoId,
            hectareas,
            activo,
        },
        include: loteFisicoInclude,
    });
}

/* =====================================================
   ELIMINAR / DESACTIVAR
===================================================== */

export async function eliminarLoteFisico(
    id: number,
) {
    const loteId = validarId(
        id,
        "El ID del lote físico",
    );

    const lote = await prisma.loteFisico.findUnique({
        where: { id: loteId },
        include: loteFisicoInclude,
    });

    if (!lote) {
        throw new LoteFisicoError(
            "Lote físico no encontrado",
            404,
        );
    }

    /*
     * Con historial: eliminación lógica.
     */
    if (lote._count.cosechas > 0) {
        const actualizado = await prisma.loteFisico.update({
            where: { id: loteId },
            data: {
                activo: false,
            },
            include: loteFisicoInclude,
        });

        return {
            tipo: "DESACTIVADO" as const,
            lote: actualizado,
        };
    }

    /*
     * Sin historial: eliminación física.
     */
    const eliminado = await prisma.loteFisico.delete({
        where: { id: loteId },
    });

    return {
        tipo: "ELIMINADO" as const,
        lote: eliminado,
    };
}
