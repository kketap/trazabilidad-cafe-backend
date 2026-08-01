// src/modules/ventas/ventas.service.ts
import { prisma } from "../../config/prisma";
import type { CrearVentaDTO, ActualizarVentaDTO } from "./ventas.dto";

const ventaInclude = {
  cliente: true,
  ordenTrilla: true,
};

export async function calcularStockRestante(
  ordenTrillaId: string,
  excludeVentaId?: string
): Promise<number> {
  const orden = await prisma.ordenTrilla.findUnique({
    where: { id: ordenTrillaId },
  });

  if (!orden || orden.kilosNetos == null) {
    return 0;
  }

  const vendidos = await prisma.venta.aggregate({
    where: {
      ordenTrillaId,
      ...(excludeVentaId ? { id: { not: excludeVentaId } } : {}),
    },
    _sum: { kilosVendidos: true },
  });

  return orden.kilosNetos - (vendidos._sum.kilosVendidos ?? 0);
}

async function validarStock(
  ordenTrillaId: string,
  kilosVendidos: number,
  excludeVentaId?: string
): Promise<void> {
  const orden = await prisma.ordenTrilla.findUnique({
    where: { id: ordenTrillaId },
  });

  if (!orden) {
    throw new Error("Orden de trilla no encontrada");
  }

  if (orden.kilosNetos == null) {
    throw new Error("La orden de trilla aún no tiene kilos netos registrados");
  }

  const stockRestante = await calcularStockRestante(ordenTrillaId, excludeVentaId);

  if (kilosVendidos <= 0) {
    throw new Error("Los kilos vendidos deben ser mayores a 0");
  }

  if (kilosVendidos > stockRestante) {
    throw new Error(
      `Los kilos vendidos (${kilosVendidos}) superan el stock restante (${stockRestante} kg)`
    );
  }
}

async function validarCliente(clienteId: number): Promise<void> {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
  });

  if (!cliente) {
    throw new Error("Cliente no encontrado");
  }
}

export async function listarVentas() {
  return prisma.venta.findMany({
    include: ventaInclude,
    orderBy: { fechaVenta: "desc" },
  });
}

export async function obtenerVentaPorId(id: string) {
  return prisma.venta.findUnique({
    where: { id },
    include: ventaInclude,
  });
}

export async function crearVenta(data: CrearVentaDTO) {
  await validarCliente(Number(data.clienteId));
  await validarStock(data.ordenTrillaId, Number(data.kilosVendidos));

  if (!data.producto?.trim()) {
    throw new Error("El campo 'producto' es requerido");
  }

  if (!data.presentacionSacos?.trim()) {
    throw new Error("El campo 'presentacionSacos' es requerido");
  }

  if (Number(data.precioVentaKilo) <= 0) {
    throw new Error("El precio de venta por kilo debe ser mayor a 0");
  }

  return prisma.venta.create({
    data: {
      fechaVenta: data.fechaVenta ? new Date(data.fechaVenta) : new Date(),
      producto: data.producto.trim(),
      kilosVendidos: Number(data.kilosVendidos),
      presentacionSacos: data.presentacionSacos.trim(),
      precioVentaKilo: Number(data.precioVentaKilo),
      precioCompra:
        data.precioCompra != null && !isNaN(Number(data.precioCompra))
          ? Number(data.precioCompra)
          : null,
      numeroFactura: data.numeroFactura?.trim() || null,
      numeroGuiaRemision: data.numeroGuiaRemision?.trim() || null,
      fincaOrigen: data.fincaOrigen?.trim() || null,
      clienteId: Number(data.clienteId),
      ordenTrillaId: data.ordenTrillaId,
    },
    include: ventaInclude,
  });
}

export async function actualizarVenta(id: string, data: ActualizarVentaDTO) {
  const ventaExistente = await prisma.venta.findUnique({
    where: { id },
  });

  if (!ventaExistente) {
    throw new Error("Venta no encontrada");
  }

  const ordenTrillaId = data.ordenTrillaId ?? ventaExistente.ordenTrillaId;
  const kilosVendidos =
    data.kilosVendidos !== undefined
      ? Number(data.kilosVendidos)
      : ventaExistente.kilosVendidos;

  if (data.clienteId !== undefined) {
    await validarCliente(Number(data.clienteId));
  }

  await validarStock(ordenTrillaId, kilosVendidos, id);

  if (data.precioVentaKilo !== undefined && Number(data.precioVentaKilo) <= 0) {
    throw new Error("El precio de venta por kilo debe ser mayor a 0");
  }

  return prisma.venta.update({
    where: { id },
    data: {
      ...(data.fechaVenta !== undefined && {
        fechaVenta: new Date(data.fechaVenta),
      }),
      ...(data.producto !== undefined && { producto: data.producto.trim() }),
      ...(data.kilosVendidos !== undefined && {
        kilosVendidos: Number(data.kilosVendidos),
      }),
      ...(data.presentacionSacos !== undefined && {
        presentacionSacos: data.presentacionSacos.trim(),
      }),
      ...(data.precioVentaKilo !== undefined && {
        precioVentaKilo: Number(data.precioVentaKilo),
      }),
      ...(data.precioCompra !== undefined && {
        precioCompra:
          data.precioCompra != null && !isNaN(Number(data.precioCompra))
            ? Number(data.precioCompra)
            : null,
      }),
      ...(data.numeroFactura !== undefined && {
        numeroFactura: data.numeroFactura?.trim() || null,
      }),
      ...(data.numeroGuiaRemision !== undefined && {
        numeroGuiaRemision: data.numeroGuiaRemision?.trim() || null,
      }),
      ...(data.fincaOrigen !== undefined && {
        fincaOrigen: data.fincaOrigen?.trim() || null,
      }),
      ...(data.clienteId !== undefined && { clienteId: Number(data.clienteId) }),
      ...(data.ordenTrillaId !== undefined && { ordenTrillaId: data.ordenTrillaId }),
    },
    include: ventaInclude,
  });
}

export async function eliminarVenta(id: string) {
  const ventaExistente = await prisma.venta.findUnique({
    where: { id },
  });

  if (!ventaExistente) {
    throw new Error("Venta no encontrada");
  }

  return prisma.venta.delete({
    where: { id },
  });
}
