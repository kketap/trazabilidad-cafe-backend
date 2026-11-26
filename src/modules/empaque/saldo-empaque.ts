type StockAlmacen = {
    kilosResultantes: number;
    ordenesTrilla: { kilosEnviados: number }[];
    enviosTrilla?: { kilosNetos: number }[];
};

export function saldoNetoTrilla(registro: StockAlmacen) {
    const usados = registro.ordenesTrilla.reduce((suma, orden) => suma + orden.kilosEnviados, 0) +
        (registro.enviosTrilla ?? []).reduce((suma, envio) => suma + envio.kilosNetos, 0);
    return Math.max(0, Number((registro.kilosResultantes - usados).toFixed(2)));
}
