// src/modules/trilla/trilla.service.ts
import { randomUUID } from "crypto";
import { prisma } from "../../config/prisma";
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
  ordenLotes: {
    include: {
      lote: true,
    },
  },
};

export function enriquecerOrdenTrilla(o: any) {
  const baseKilos = Number(o.kilosNetos ?? o.kilosEnviados ?? 0);
  const exp = Number(o.exportable ?? 0);
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

  const restoKilos = otrosSubproductos > 0
    ? otrosSubproductos
    : Math.max(0, baseKilos - (exp + rec));

  const pctResto = baseKilos > 0 ? Number(((restoKilos / baseKilos) * 100).toFixed(2)) : 0;

  return {
    ...o,
    metricasRendimiento: {
      baseKilos,
      exportableKg: exp,
      exportablePct: pctExportable,
      recuperadoKg: rec,
      recuperadoPct: pctRecuperado,
      restoKg: Number(restoKilos.toFixed(2)),
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

export async function crearOrdenTrilla(data: CrearOrdenTrillaDTO) {
  const kilosEnviados = Number(data.kilosEnviados);
  if (!Number.isFinite(kilosEnviados) || kilosEnviados <= 0) {
    throw new Error("Los kilos enviados deben ser un número mayor a cero");
  }

  const loteIds = Array.isArray(data.loteIds)
    ? data.loteIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
    : [];

  if (loteIds.length === 0) {
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
  });
}

export async function actualizarOrdenTrilla(id: string, data: ActualizarOrdenTrillaDTO) {
  const ordenExistente = await prisma.ordenTrilla.findUnique({
    where: { id },
  });

  if (!ordenExistente) {
    throw new Error("Orden de trilla no encontrada");
  }

  const updateData: any = {};

  if (data.codigoTrilla !== undefined) {
    updateData.codigoTrilla = data.codigoTrilla.trim();
  }
  if (data.numeroGuia !== undefined) {
    updateData.numeroGuia = data.numeroGuia ? data.numeroGuia.trim() : null;
  }
  if (data.fechaDespacho !== undefined) {
    updateData.fechaDespacho = new Date(data.fechaDespacho);
  }
  if (data.fechaIngreso !== undefined) {
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
  if (data.kilosNetos !== undefined) {
    updateData.kilosNetos = parseOptionalNumber(data.kilosNetos, "kilosNetos");
  }
  if (data.exportable !== undefined) {
    updateData.exportable = parseOptionalNumber(data.exportable, "exportable");
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
    where: { id },
    data: updateData,
    include: ordenTrillaIncludeDefault,
  });

  return enriquecerOrdenTrilla(actualizada);
}

export async function eliminarOrdenTrilla(id: string) {
  return prisma.ordenTrilla.delete({
    where: { id },
  });
}
