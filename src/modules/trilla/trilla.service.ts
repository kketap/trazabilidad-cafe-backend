// src/modules/trilla/trilla.service.ts
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { saldoNetoTrilla } from "../empaque/saldo-empaque";
import type { CrearOrdenTrillaDTO, ActualizarOrdenTrillaDTO } from "./trilla.dto";

function parseOptionalNumber(val: any, fieldName: string): number | null | undefined {
  if (val === undefined) return undefined;
  if (val === null || val === "") return null;
  const num = Number(val);
  if (!Number.isFinite(num)) {
    throw new Error(`El campo '${fieldName}' debe ser un número válido`);
  }
  return num;
}

const ordenTrillaIncludeDefault = {
  lotes: true,
  almacenes: {
    include: {
      empaque: {
        include: {
          lote: true,
          secado: { include: { lote: true, secadoLotes: { include: { lote: true } } } },
          empaqueSecados: { include: { secado: { include: { lote: true, secadoLotes: { include: { lote: true } } } } } },
        },
      },
    },
  },
  ordenLotes: {
    include: {
      lote: true,
    },
  },
};

export function enriquecerOrdenTrilla(o: any) {
  const baseKilos = Number(o.kilosNetos ?? o.kilosEnviados ?? 0);
  const exp = [o.exportable, o.exportable2, o.exportable3, o.exportable4]
    .reduce((total, kilos) => total + Number(kilos ?? 0), 0);
  const rec = Number(o.recuperado ?? 0);

  const pctExportable = baseKilos > 0 ? Number(((exp / baseKilos) * 100).toFixed(2)) : 0;
  const pctRecuperado = baseKilos > 0 ? Number(((rec / baseKilos) * 100).toFixed(2)) : 0;

  const otrosSubproductos =
    Number(o.malla13 ?? 0) +
    Number(o.segundaBuena ?? 0) +
    Number(o.segundaMala ?? 0) +
    Number(o.sucioEscojo ?? 0) +
    Number(o.cisco ?? 0) +
    Number(o.descarteMaquina ?? 0) +
    Number(o.cascarilla ?? 0);

  const pctResto = baseKilos > 0 ? Number(((otrosSubproductos / baseKilos) * 100).toFixed(2)) : 0;

  const lotesAlmacen = new Map<number, unknown>();
  for (const { empaque } of o.almacenes ?? []) {
    const secados = empaque.empaqueSecados.length
      ? empaque.empaqueSecados.map((vinculo: any) => vinculo.secado)
      : empaque.secado ? [empaque.secado] : [];
    if (!secados.length) lotesAlmacen.set(empaque.lote.id, empaque.lote);
    for (const secado of secados) {
      const lotes = secado.secadoLotes.length
        ? secado.secadoLotes.map((aporte: any) => aporte.lote) : [secado.lote];
      for (const lote of lotes) lotesAlmacen.set(lote.id, lote);
    }
  }

  return {
    ...o,
    ...(lotesAlmacen.size && { lotes: [...lotesAlmacen.values()] }),
    metricasRendimiento: {
      baseKilos,
      exportableKg: exp,
      exportablePct: pctExportable,
      recuperadoKg: rec,
      recuperadoPct: pctRecuperado,
      restoKg: Number(otrosSubproductos.toFixed(2)),
      restoPct: pctResto,
    },
  };
}

export async function listarOrdenesTrilla() {
  const ordenes = await prisma.ordenTrilla.findMany({
    include: ordenTrillaIncludeDefault,
    orderBy: {
      createdAt: "desc",
    },
  });
  return ordenes.map(enriquecerOrdenTrilla);
}

export async function obtenerOrdenTrillaPorId(id: string) {
  const orden = await prisma.ordenTrilla.findUnique({
    where: { id },
    include: ordenTrillaIncludeDefault,
  });
  return orden ? enriquecerOrdenTrilla(orden) : null;
}

export class ErrorEnvioAlmacen extends Error {
  constructor(mensaje: string, public readonly estado = 400) {
    super(mensaje);
  }
}

export async function crearOrdenTrilla(data: CrearOrdenTrillaDTO) {
  const envios = data.enviosAlmacen;
  if (envios !== undefined && (!Array.isArray(envios) || !envios.length || envios.some((envio) =>
    !envio || !Number.isSafeInteger(envio.empaqueId) || envio.empaqueId <= 0
  ))) {
    throw new ErrorEnvioAlmacen("Selecciona al menos un registro válido de Almacén Pergamino.");
  }
  const empaqueIds = envios?.map(({ empaqueId }) => empaqueId) ?? data.empaqueIds;
  const kilosEnviados = Number(data.kilosEnviados);
  if (empaqueIds === undefined && (!Number.isFinite(kilosEnviados) || kilosEnviados <= 0)) {
    throw new Error("Los kilos enviados deben ser un número mayor a cero");
  }

  const loteIds = Array.isArray(data.loteIds)
    ? data.loteIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
    : [];

  if (empaqueIds === undefined && data.empaqueId === undefined && loteIds.length === 0) {
    throw new Error("Debe seleccionar al menos un lote de origen válido");
  }

  const uniqueId = randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase();
  const codigoTrilla = data.codigoTrilla?.trim() || `TEMP-${uniqueId}`;
  const numeroGuia =
    data.numeroGuia !== undefined && data.numeroGuia !== null
      ? String(data.numeroGuia).trim() || null
      : null;

  const exportable = parseOptionalNumber(data.exportable, "exportable") ?? null;
  const recuperado = parseOptionalNumber(data.recuperado, "recuperado") ?? null;
  const malla13 = parseOptionalNumber(data.malla13, "malla13") ?? null;
  const segundaBuena = parseOptionalNumber(data.segundaBuena, "segundaBuena") ?? null;
  const segundaMala = parseOptionalNumber(data.segundaMala, "segundaMala") ?? null;
  const sucioEscojo = parseOptionalNumber(data.sucioEscojo, "sucioEscojo") ?? null;
  const cisco = parseOptionalNumber(data.cisco, "cisco") ?? null;
  const descarteMaquina =
    parseOptionalNumber(data.descarteMaquina, "descarteMaquina") ?? null;
  const cascarilla = parseOptionalNumber(data.cascarilla, "cascarilla") ?? null;

  const tieneDescuentosManuales =
    Array.isArray(data.descuentosPorLote) && data.descuentosPorLote.length > 0;

  return prisma.$transaction(async (tx) => {
    if (empaqueIds !== undefined) {
      const ids = empaqueIds;
      if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length ||
          ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
        throw new ErrorEnvioAlmacen("Selecciona registros de almacén válidos y sin repetir.");
      }
      const guiaSalida = typeof data.guiaSalida === "string" ? data.guiaSalida.trim() : "";
      if (!guiaSalida) throw new ErrorEnvioAlmacen("Ingrese la guía de salida.");

      const registros = await tx.empaque.findMany({
        where: { id: { in: ids } },
        include: {
          ordenesTrilla: { select: { kilosEnviados: true } },
          enviosTrilla: { select: { kilosNetos: true } },
        },
      });
      if (registros.length !== ids.length) {
        throw new ErrorEnvioAlmacen("Uno o más registros de almacén ya no están disponibles. Revisa la selección.", 409);
      }

      const cantidades = new Map(envios?.map(({ empaqueId, kilosNetos }) => [empaqueId, kilosNetos]));
      const almacenes = registros.map((registro) => {
        const codigo = registro.codigo ?? `EMP-${registro.id}`;
        const saldo = saldoNetoTrilla(registro);
        if (saldo <= 0) {
          throw new ErrorEnvioAlmacen(`El registro ${codigo} ya no tiene saldo. Retíralo del envío.`, 409);
        }
        const kilos = envios ? cantidades.get(registro.id) : saldo;
        if (typeof kilos !== "number" || !Number.isFinite(kilos) || kilos < 0.01 ||
            Math.abs(kilos * 100 - Math.round(kilos * 100)) > 0.000001) {
          throw new ErrorEnvioAlmacen(`Ingresa una cantidad mayor a cero, con hasta dos decimales, para ${codigo}.`);
        }
        const kilosNetos = Math.round(kilos * 100) / 100;
        if (kilosNetos > saldo) {
          throw new ErrorEnvioAlmacen(
            `${codigo} tiene ${saldo.toLocaleString("es-CL")} kg netos disponibles. Ajusta la cantidad para continuar.`,
            409,
          );
        }
        return { empaqueId: registro.id, kilosNetos };
      });
      const total = Number(almacenes.reduce((suma, registro) => suma + registro.kilosNetos, 0).toFixed(2));
      const orden = await tx.ordenTrilla.create({
        data: {
          codigoTrilla, guiaSalida, kilosEnviados: total,
          fechaDespacho: data.fechaDespacho ? new Date(data.fechaDespacho) : new Date(),
          estadoManual: "EN_PROCESO",
          almacenes: { create: almacenes },
        },
        include: ordenTrillaIncludeDefault,
      });
      return enriquecerOrdenTrilla(orden);
    }
    if (data.empaqueId !== undefined) {
      if (!Number.isSafeInteger(data.empaqueId) || data.empaqueId <= 0) {
        throw new Error("Seleccione un registro válido de Almacén Pergamino");
      }
      const empaque = await tx.empaque.findUnique({
        where: { id: data.empaqueId },
        include: {
          ordenesTrilla: { select: { kilosEnviados: true } },
          enviosTrilla: { select: { kilosNetos: true } },
          secado: { include: { secadoLotes: true } },
          empaqueSecados: { include: { secado: { include: { secadoLotes: true } } } },
        },
      });
      if (!empaque) throw new Error("No se encontró el registro de Almacén Pergamino");
      const disponibles = saldoNetoTrilla(empaque);
      if (kilosEnviados > disponibles) {
        throw new Error(`El registro de Almacén Pergamino tiene ${disponibles} kg disponibles`);
      }
      const secados = empaque.empaqueSecados.length
        ? empaque.empaqueSecados.map(({ secado }) => secado)
        : empaque.secado ? [empaque.secado] : [];
      const origenes = secados.flatMap((secado) =>
        secado.secadoLotes.length ? secado.secadoLotes.map(({ loteId }) => loteId) : [secado.loteId],
      );
      const ids = [...new Set(origenes.length ? origenes : [empaque.loteId])];
      const orden = await tx.ordenTrilla.create({
        data: {
          empaqueId: empaque.id,
          codigoTrilla,
          numeroGuia,
          kilosEnviados,
          fechaDespacho: data.fechaDespacho ? new Date(data.fechaDespacho) : new Date(),
          sacosEnviados: data.sacosEnviados ?? null,
          estadoManual: "EN_PROCESO",
          exportable,
          recuperado,
          malla13,
          segundaBuena,
          segundaMala,
          sucioEscojo,
          cisco,
          descarteMaquina,
          cascarilla,
          lotes: { connect: ids.map((id) => ({ id })) },
        },
        include: ordenTrillaIncludeDefault,
      });
      return enriquecerOrdenTrilla(orden);
    }
    // 1. Obtener y validar lotes de origen
    const lotes = await tx.lote.findMany({
      where: {
        id: { in: loteIds },
      },
    });

    if (lotes.length !== loteIds.length) {
      throw new Error("Uno o más lotes seleccionados no existen");
    }

    const lotesInactivos = lotes.filter((l) => !l.activo);
    if (lotesInactivos.length > 0) {
      throw new Error(`El lote ${lotesInactivos[0].codigo} se encuentra inactivo`);
    }

    // Calcular total disponible en los lotes seleccionados
    const totalDisponible = lotes.reduce((acc, l) => {
      const disp = Number(l.kilosActuales ?? l.kilosIniciales ?? 0);
      return acc + (Number.isFinite(disp) ? disp : 0);
    }, 0);

    if (kilosEnviados > totalDisponible) {
      throw new Error(
        `Los kilos enviados (${kilosEnviados} kg) superan los kilos disponibles en los lotes seleccionados (${totalDisponible} kg)`,
      );
    }

    // 2. Crear orden de trilla con subproductos y guía
    const orden = await tx.ordenTrilla.create({
      data: {
        codigoTrilla,
        numeroGuia,
        kilosEnviados,
        sacosEnviados: data.sacosEnviados != null ? Number(data.sacosEnviados) : null,
        fechaDespacho: data.fechaDespacho ? new Date(data.fechaDespacho) : new Date(),
        exportable,
        recuperado,
        malla13,
        segundaBuena,
        segundaMala,
        sucioEscojo,
        cisco,
        descarteMaquina,
        cascarilla,
        lotes: {
          connect: loteIds.map((id) => ({ id })),
        },
      },
      include: ordenTrillaIncludeDefault,
    });

    // 3. Descontar kilos: Manual vs Automático
    if (tieneDescuentosManuales) {
      // DESCUENTO MANUAL: usar exactamente lo que el usuario especificó por lote
      for (const desc of data.descuentosPorLote!) {
        const lote = lotes.find((l) => l.id === Number(desc.loteId));
        if (!lote) continue;

        const disponible = Number(lote.kilosActuales ?? lote.kilosIniciales ?? 0);
        const aDescontar = Number(desc.kilosDescontados);

        if (aDescontar > disponible) {
          throw new Error(
            `El descuento manual para el lote ${lote.codigo} (${aDescontar} kg) supera su saldo disponible (${disponible} kg)`
          );
        }

        const nuevoSaldo = Math.max(0, Number((disponible - aDescontar).toFixed(2)));
        const nuevoEstado = nuevoSaldo === 0 ? "CERRADO" : "EN_PROCESO";

        await tx.lote.update({
          where: { id: lote.id },
          data: {
            kilosActuales: nuevoSaldo,
            estado: nuevoEstado,
          },
        });

        await tx.ordenTrillaLote.create({
          data: {
            ordenTrillaId: orden.id,
            loteId: lote.id,
            kilosDescontados: aDescontar,
            sacos: desc.sacos != null ? Number(desc.sacos) : null,
          },
        });
      }
    } else {
      // DESCUENTO AUTOMÁTICO (greedy): fallback secuencial si no viene desglose manual
      let restantePorDescontar = kilosEnviados;
      for (const lote of lotes) {
        const disponible = Number(lote.kilosActuales ?? lote.kilosIniciales ?? 0);
        const aDescontar = Math.min(disponible, restantePorDescontar);
        const nuevoSaldo = Math.max(0, Number((disponible - aDescontar).toFixed(2)));
        const nuevoEstado = nuevoSaldo === 0 ? "CERRADO" : "EN_PROCESO";

        await tx.lote.update({
          where: { id: lote.id },
          data: {
            kilosActuales: nuevoSaldo,
            estado: nuevoEstado,
          },
        });

        if (aDescontar > 0) {
          await tx.ordenTrillaLote.create({
            data: {
              ordenTrillaId: orden.id,
              loteId: lote.id,
              kilosDescontados: aDescontar,
            },
          });
        }

        restantePorDescontar -= aDescontar;
      }
    }

    const ordenCompleta = await tx.ordenTrilla.findUnique({
      where: { id: orden.id },
      include: ordenTrillaIncludeDefault,
    });

    return enriquecerOrdenTrilla(ordenCompleta);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function actualizarOrdenTrilla(id: string, data: ActualizarOrdenTrillaDTO) {
  const ordenExistente = await prisma.ordenTrilla.findUnique({
    where: { id },
    include: { _count: { select: { almacenes: true } } },
  });

  if (!ordenExistente) {
    throw new Error("Orden de trilla no encontrada");
  }

  if ((ordenExistente.empaqueId != null || ordenExistente._count.almacenes > 0) &&
      ((data.kilosEnviados !== undefined && data.kilosEnviados !== ordenExistente.kilosEnviados) || data.loteIds !== undefined)) {
    throw new Error("Los kilos enviados y lotes de una orden vinculada se definen al crearla");
  }
  const updateData: Prisma.OrdenTrillaUpdateInput = {};
  if (data.guiaIngreso !== undefined) {
    const guia = typeof data.guiaIngreso === "string" ? data.guiaIngreso.trim() : "";
    if (!guia) throw new Error("Ingrese la guía de ingreso");
    updateData.guiaIngreso = guia;
    updateData.fechaIngreso = ordenExistente.fechaIngreso ?? new Date();
  }
  if (ordenExistente._count.almacenes > 0 && data.estadoManual === "TERMINADO" &&
      !data.guiaIngreso && !ordenExistente.guiaIngreso) {
    throw new Error("Ingrese la guía de ingreso antes de terminar la orden");
  }

  if (data.estadoManual !== undefined) {
    if (!["EN_PROCESO", "TERMINADO", "DESPACHADO"].includes(data.estadoManual)) {
      throw new Error("Estado de trilla inválido");
    }
    updateData.estadoManual = data.estadoManual;
  }
  if (data.numeroGuiaHayland !== undefined) {
    updateData.numeroGuiaHayland = String(data.numeroGuiaHayland ?? "").trim() || null;
  }
  for (const campo of ["exportable", "exportable2", "exportable3", "exportable4"] as const) {
    const kilos = parseOptionalNumber(data[campo], campo);
    if (kilos != null && kilos < 0) throw new Error("Los kilos exportables no pueden ser negativos");
    if (kilos !== undefined) updateData[campo] = kilos;
  }

  if (data.codigoTrilla !== undefined) {
    updateData.codigoTrilla = data.codigoTrilla.trim();
  }
  if (data.numeroGuia !== undefined) {
    updateData.numeroGuia = data.numeroGuia ? data.numeroGuia.trim() : null;
  }
  if (data.fechaDespacho !== undefined) {
    updateData.fechaDespacho = new Date(data.fechaDespacho);
  }
  if (data.fechaIngreso !== undefined && !ordenExistente._count.almacenes && data.guiaIngreso === undefined) {
    updateData.fechaIngreso = data.fechaIngreso ? new Date(data.fechaIngreso) : null;
  }
  if (data.calidad !== undefined) {
    updateData.calidad = data.calidad ? data.calidad.trim() : null;
  }
  if (data.tipoSaco !== undefined) {
    updateData.tipoSaco = data.tipoSaco ? data.tipoSaco.trim() : null;
  }
  if (data.sacosEnviados !== undefined) {
    updateData.sacosEnviados = data.sacosEnviados != null ? Number(data.sacosEnviados) : null;
  }
  if (data.kilosEnviados !== undefined) {
    const kEnviados = Number(data.kilosEnviados);
    if (!Number.isFinite(kEnviados) || kEnviados <= 0) {
      throw new Error("El campo kilosEnviados debe ser un número mayor a cero");
    }
    updateData.kilosEnviados = kEnviados;
  }
  const kilosNetos = parseOptionalNumber(data.kilosNetos, "kilosNetos");
  if (kilosNetos !== undefined) {
    updateData.kilosNetos = kilosNetos;
  }
  const actualizaPesos = data.kilosEnviados !== undefined || kilosNetos !== undefined;
  if (actualizaPesos) {
    const enviados = Number(data.kilosEnviados ?? ordenExistente.kilosEnviados);
    const netosFinales = kilosNetos === undefined ? ordenExistente.kilosNetos : kilosNetos;
    if (netosFinales != null && netosFinales > enviados) {
      throw new Error(`Los kilos netos resultantes no pueden superar los ${enviados.toLocaleString("es-CL")} kg enviados.`);
    }
  }
  if (data.recuperado !== undefined) {
    updateData.recuperado = parseOptionalNumber(data.recuperado, "recuperado");
  }
  if (data.malla13 !== undefined) {
    updateData.malla13 = parseOptionalNumber(data.malla13, "malla13");
  }
  if (data.segundaBuena !== undefined) {
    updateData.segundaBuena = parseOptionalNumber(data.segundaBuena, "segundaBuena");
  }
  if (data.segundaMala !== undefined) {
    updateData.segundaMala = parseOptionalNumber(data.segundaMala, "segundaMala");
  }
  if (data.sucioEscojo !== undefined) {
    updateData.sucioEscojo = parseOptionalNumber(data.sucioEscojo, "sucioEscojo");
  }
  if (data.cisco !== undefined) {
    updateData.cisco = parseOptionalNumber(data.cisco, "cisco");
  }
  if (data.descarteMaquina !== undefined) {
    updateData.descarteMaquina = parseOptionalNumber(data.descarteMaquina, "descarteMaquina");
  }
  if (data.cascarilla !== undefined) {
    updateData.cascarilla = parseOptionalNumber(data.cascarilla, "cascarilla");
  }
  if (data.loteIds !== undefined) {
    const loteIds = Array.isArray(data.loteIds) ? data.loteIds.map((lId) => Number(lId)) : [];
    updateData.lotes = {
      set: loteIds.map((lId) => ({ id: lId })),
    };
  }

  const actualizada = await prisma.ordenTrilla.update({
    where: {
      id,
      ...(actualizaPesos && {
        kilosEnviados: ordenExistente.kilosEnviados,
        kilosNetos: ordenExistente.kilosNetos,
      }),
    },
    data: updateData,
    include: ordenTrillaIncludeDefault,
  });

  return enriquecerOrdenTrilla(actualizada);
}

export async function eliminarOrdenTrilla(
  id: string,
) {
  const orden =
    await prisma.ordenTrilla.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
      },
    });

  if (!orden) {
    throw new Error(
      "Orden de trilla no encontrada",
    );
  }

  const ventasAsociadas =
    await prisma.venta.count({
      where: {
        ordenTrillaId:
          id,
      },
    });

  if (ventasAsociadas > 0) {
    throw new Error(
      `No se puede eliminar esta orden de trilla porque tiene ${ventasAsociadas} venta${ventasAsociadas === 1
        ? ""
        : "s"
      } asociada${ventasAsociadas === 1
        ? ""
        : "s"
      }.`,
    );
  }

  return prisma.ordenTrilla.delete({
    where: {
      id,
    },
  });
}