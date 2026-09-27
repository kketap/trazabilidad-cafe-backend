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

export async function listarOrdenesTrilla() {
  return prisma.ordenTrilla.findMany({
    include: {
      lotes: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function obtenerOrdenTrillaPorId(id: string) {
  return prisma.ordenTrilla.findUnique({
    where: { id },
    include: {
      lotes: true,
    },
  });
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

    // 2. Crear orden de trilla con los nuevos campos de subproductos y guía
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
      include: {
        lotes: true,
      },
    });

    // 3. Descontar kilos y actualizar estado de los lotes (Lógica de saldos parciales)
    let restantePorDescontar = kilosEnviados;
    for (const lote of lotes) {
      const disponible = Number(lote.kilosActuales ?? lote.kilosIniciales ?? 0);
      const aDescontar = Math.min(disponible, restantePorDescontar);
      const nuevoSaldo = Math.max(0, disponible - aDescontar);
      // Si el saldo llega a cero se cierra; de lo contrario se mantiene en proceso
      const nuevoEstado = nuevoSaldo === 0 ? "CERRADO" : "EN_PROCESO";

      await tx.lote.update({
        where: { id: lote.id },
        data: {
          kilosActuales: nuevoSaldo,
          estado: nuevoEstado,
        },
      });

      restantePorDescontar -= aDescontar;
    }

    return orden;
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

  return prisma.ordenTrilla.update({
    where: { id },
    data: updateData,
    include: {
      lotes: true,
    },
  });
}

export async function eliminarOrdenTrilla(id: string) {
  return prisma.ordenTrilla.delete({
    where: { id },
  });
}
