// src/modules/ventas/ventas.dto.ts

export type CrearVentaDTO = {
  fechaVenta?: string | Date;
  producto: string;
  kilosVendidos: number;
  presentacionSacos: string;
  precioVentaKilo: number;
  precioCompra?: number | null;
  numeroFactura?: string | null;
  numeroGuiaRemision?: string | null;
  fincaOrigen?: string | null;
  clienteId: number;
  ordenTrillaId: string;
};

export type ActualizarVentaDTO = Partial<CrearVentaDTO>;
