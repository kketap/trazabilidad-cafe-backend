// src/modules/lotes-fisicos/lotes-fisicos.controller.ts


import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";

import {
    LoteFisicoError,
    actualizarLoteFisico,
    crearLoteFisico,
    eliminarLoteFisico,
    listarLotesFisicos,
    obtenerLoteFisicoPorId,
} from "./lotes-fisicos.service";

import type {
    ActualizarLoteFisicoInput,
    LoteFisicoInput,
} from "./lotes-fisicos.service";

/* =====================================================
   HELPERS
===================================================== */

function obtenerId(
    valor: string | string[] | undefined,
): number | null {
    // No aceptar parámetros ausentes o arreglos
    if (typeof valor !== "string") {
        return null;
    }

    // Evitar strings vacíos o espacios
    const valorLimpio = valor.trim();

    if (!/^\d+$/.test(valorLimpio)) {
        return null;
    }

    const id = Number(valorLimpio);

    // Validar que sea un entero positivo y seguro
    if (
        !Number.isSafeInteger(id) ||
        id <= 0
    ) {
        return null;
    }

    return id;
}

function responderError(
    res: Response,
    error: unknown,
    mensajeDefault: string,
): void {
    console.error(mensajeDefault, error);

    if (error instanceof LoteFisicoError) {
        res.status(error.statusCode).json({
            ok: false,
            message: error.message,
        });
        return;
    }

    if (
        error instanceof Prisma.PrismaClientKnownRequestError
    ) {
        if (error.code === "P2002") {
            res.status(409).json({
                ok: false,
                message:
                    "Ya existe un lote físico con este código o número dentro del fundo seleccionado",
            });
            return;
        }

        if (error.code === "P2003") {
            res.status(409).json({
                ok: false,
                message:
                    "No se puede realizar la operación porque el lote físico tiene relaciones asociadas",
            });
            return;
        }

        if (error.code === "P2025") {
            res.status(404).json({
                ok: false,
                message: "Lote físico no encontrado",
            });
            return;
        }
    }

    res.status(500).json({
        ok: false,
        message: mensajeDefault,
    });
}

/* =====================================================
   LISTAR
   GET /api/lotes-fisicos
===================================================== */

export async function getLotesFisicos(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        const search =
            typeof req.query.search === "string"
                ? req.query.search.trim()
                : undefined;

        let fundoId: number | undefined;

        if (req.query.fundoId !== undefined) {
            if (typeof req.query.fundoId !== "string") {
                res.status(400).json({
                    ok: false,
                    message: "El filtro fundoId es inválido",
                });
                return;
            }

            const parsed = obtenerId(req.query.fundoId);

            if (parsed === null) {
                res.status(400).json({
                    ok: false,
                    message: "El filtro fundoId es inválido",
                });
                return;
            }

            fundoId = parsed;
        }

        let activo: boolean | undefined;

        if (req.query.activo !== undefined) {
            if (req.query.activo === "true") {
                activo = true;
            } else if (req.query.activo === "false") {
                activo = false;
            } else {
                res.status(400).json({
                    ok: false,
                    message:
                        "El filtro activo debe ser true o false",
                });
                return;
            }
        }

        const lotes = await listarLotesFisicos({
            search,
            fundoId,
            activo,
        });

        res.json({
            ok: true,
            data: lotes,
        });
    } catch (error: unknown) {
        responderError(
            res,
            error,
            "Error listando lotes físicos",
        );
    }
}

/* =====================================================
   DETALLE
   GET /api/lotes-fisicos/:id
===================================================== */

export async function getLoteFisico(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        const id = obtenerId(req.params.id);

        if (id === null) {
            res.status(400).json({
                ok: false,
                message: "ID de lote físico inválido",
            });
            return;
        }

        const lote = await obtenerLoteFisicoPorId(id);

        if (!lote) {
            res.status(404).json({
                ok: false,
                message: "Lote físico no encontrado",
            });
            return;
        }

        res.json({
            ok: true,
            data: lote,
        });
    } catch (error: unknown) {
        responderError(
            res,
            error,
            "Error obteniendo lote físico",
        );
    }
}

/* =====================================================
   CREAR
   POST /api/lotes-fisicos
===================================================== */

export async function createLoteFisico(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        const body = req.body as Partial<LoteFisicoInput>;

        if (
            body.fundoId === undefined ||
            body.numero === undefined
        ) {
            res.status(400).json({
                ok: false,
                message:
                    "Los campos fundoId y numero son obligatorios",
            });
            return;
        }

        const lote = await crearLoteFisico({
            fundoId: body.fundoId,
            numero: body.numero,
            ...(body.codigo !== undefined && {
                codigo: body.codigo,
            }),
            ...(body.hectareas !== undefined && {
                hectareas: body.hectareas,
            }),
            ...(body.activo !== undefined && {
                activo: body.activo,
            }),
        });

        res.status(201).json({
            ok: true,
            message: "Lote físico creado correctamente",
            data: lote,
        });
    } catch (error: unknown) {
        responderError(
            res,
            error,
            "Error creando lote físico",
        );
    }
}

/* =====================================================
   ACTUALIZAR
   PUT /api/lotes-fisicos/:id
===================================================== */

export async function updateLoteFisico(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        const id = obtenerId(req.params.id);

        if (id === null) {
            res.status(400).json({
                ok: false,
                message: "ID de lote físico inválido",
            });
            return;
        }

        const body =
            req.body as ActualizarLoteFisicoInput;

        const lote = await actualizarLoteFisico(
            id,
            body,
        );

        res.json({
            ok: true,
            message: "Lote físico actualizado correctamente",
            data: lote,
        });
    } catch (error: unknown) {
        responderError(
            res,
            error,
            "Error actualizando lote físico",
        );
    }
}

/* =====================================================
   ELIMINAR / DESACTIVAR
   DELETE /api/lotes-fisicos/:id
===================================================== */

export async function deleteLoteFisico(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        const id = obtenerId(req.params.id);

        if (id === null) {
            res.status(400).json({
                ok: false,
                message: "ID de lote físico inválido",
            });
            return;
        }

        const resultado = await eliminarLoteFisico(id);

        const desactivado =
            resultado.tipo === "DESACTIVADO";

        res.json({
            ok: true,
            message: desactivado
                ? "El lote físico tiene cosechas asociadas y fue desactivado para conservar su historial"
                : "Lote físico eliminado correctamente",
            data: {
                accion: resultado.tipo,
                lote: resultado.lote,
            },
        });
    } catch (error: unknown) {
        responderError(
            res,
            error,
            "Error eliminando lote físico",
        );
    }
}
