export type DescuentoLoteInput = {
  loteId: number;
  kilosDescontados: number;
  sacos?: number | null;
};

export type CrearOrdenTrillaDTO = {
  loteIds: number[];
  descuentosPorLote?: DescuentoLoteInput[];
  kilosEnviados: number;
  sacosEnviados?: number | null;
  fechaDespacho?: string | Date;
  codigoTrilla?: string;
  numeroGuia?: string | null;
  exportable?: number | null;
  recuperado?: number | null;
  malla13?: number | null;
  segundaBuena?: number | null;
  segundaMala?: number | null;
  sucioEscojo?: number | null;
  cisco?: number | null;
  descarteMaquina?: number | null;
  cascarilla?: number | null;
};

export type ActualizarOrdenTrillaDTO = {
  codigoTrilla?: string;
  numeroGuia?: string | null;
  fechaDespacho?: string | Date;
  fechaIngreso?: string | Date | null;
  calidad?: string | null;
  tipoSaco?: string | null;
  sacosEnviados?: number | null;
  kilosEnviados?: number;
  kilosNetos?: number | null;
  loteIds?: number[];
  exportable?: number | null;
  recuperado?: number | null;
  malla13?: number | null;
  segundaBuena?: number | null;
  segundaMala?: number | null;
  sucioEscojo?: number | null;
  cisco?: number | null;
  descarteMaquina?: number | null;
  cascarilla?: number | null;
};
