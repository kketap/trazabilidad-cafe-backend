// src/modules/trilla/trilla.dto.ts

export type CrearOrdenTrillaDTO = {
  loteIds: number[];
  kilosEnviados: number;
  fechaDespacho?: string | Date;
  codigoTrilla?: string;
};

export type ActualizarOrdenTrillaDTO = {
  codigoTrilla?: string;
  fechaDespacho?: string | Date;
  fechaIngreso?: string | Date | null;
  calidad?: string | null;
  tipoSaco?: string | null;
  kilosEnviados?: number;
  kilosNetos?: number | null;
  loteIds?: number[];
};
