// src/modules/kpis/kpis.service.ts
import { prisma } from "../../config/prisma";

export type KpiCosechaItem = {
    id: number;
    fecha: string;
    kilosDia: number;
    kilosTotalesMes: number;
    porcentaje: number;
    mes: string;
    anio: number;
};

export async function obtenerKpisCosechas(): Promise<KpiCosechaItem[]> {
    const cosechas = await prisma.cosecha.findMany({
        orderBy: { fecha: "asc" },
    });

    const totalesPorMes = new Map<string, number>();

    for (const cosecha of cosechas) {
        const fecha = new Date(cosecha.fecha);
        const anio = fecha.getFullYear();
        const mes = fecha.getMonth();
        const clave = `${anio}-${mes}`;

        const actual = totalesPorMes.get(clave) ?? 0;
        totalesPorMes.set(clave, actual + cosecha.kilosCosechados);
    }

    return cosechas.map((cosecha) => {
        const fecha = new Date(cosecha.fecha);
        const anio = fecha.getFullYear();
        const mes = fecha.getMonth();
        const clave = `${anio}-${mes}`;
        const kilosTotalesMes = totalesPorMes.get(clave) ?? 0;

        const porcentaje =
            kilosTotalesMes > 0
                ? Number(
                      ((cosecha.kilosCosechados / kilosTotalesMes) * 100).toFixed(2),
                  )
                : 0;

        return {
            id: cosecha.id,
            fecha: fecha.toISOString(),
            kilosDia: cosecha.kilosCosechados,
            kilosTotalesMes,
            porcentaje,
            mes: fecha.toLocaleString("es-CL", { month: "long" }),
            anio,
        };
    });
}

export async function obtenerKpisTrazabilidad() {
    const [procesos, secados, empaques, ordenesTrilla, ventas] = await Promise.all([
        prisma.procesoTrazabilidad.findMany({
            orderBy: { fecha: "desc" },
            include: { Lote: true },
        }),
        prisma.secado.findMany({
            orderBy: { fechaInicio: "desc" },
            include: { lote: true },
        }),
        prisma.empaque.findMany({ orderBy: { fechaInicio: "desc" } }),
        prisma.ordenTrilla.findMany({
            orderBy: { fechaDespacho: "desc" },
            include: { lotes: true },
        }),
        prisma.venta.findMany({ orderBy: { fechaVenta: "desc" } }),
    ]);

    // 1. Resumen General (KPI Cards)
    const totalIngresadoProcesos = procesos.reduce((acc, p) => acc + p.kilosIngresados, 0);
    const totalDuracionHorasProcesos = procesos.reduce((acc, p) => acc + p.duracionHoras, 0);
    const duracionPromedioHoras = procesos.length > 0 ? totalDuracionHorasProcesos / procesos.length : 0;

    const totalIngresadoSecado = secados.reduce((acc, s) => acc + s.kilosIngresados, 0);
    const totalResultanteSecado = secados.reduce((acc, s) => acc + s.kilosResultantes, 0);
    const totalMermaSecado = secados.reduce((acc, s) => acc + s.merma, 0);
    const porcMermaSecadoPromedio = totalIngresadoSecado > 0 ? (totalMermaSecado / totalIngresadoSecado) * 100 : 0;

    const totalKilosEnviadosTrilla = ordenesTrilla.reduce((acc, t) => acc + t.kilosEnviados, 0);
    const totalKilosNetosTrilla = ordenesTrilla.reduce((acc, t) => acc + (t.kilosNetos || 0), 0);

    const totalKilosVendidos = ventas.reduce((acc, v) => acc + v.kilosVendidos, 0);
    const totalIngresosVentas = ventas.reduce((acc, v) => acc + (v.kilosVendidos * v.precioVentaKilo), 0);

    // 2. Desglose por Tipo de Proceso Húmedo
    const porTipoProcesoMap = new Map<
        string,
        {
            tipo: string;
            kilos: number;
            duracionHoras: number;
            cantidad: number;
            detalles: {
                id: number;
                codigo: string;
                fecha: string;
                etapa: string | null;
                duracionHoras: number;
                kilosIngresados: number;
                loteCodigo: string | null;
            }[];
        }
    >();

    for (const p of procesos) {
        const tipo = p.tipoProceso || p.etapa || "Proceso General";
        const cur = porTipoProcesoMap.get(tipo) || { tipo, kilos: 0, duracionHoras: 0, cantidad: 0, detalles: [] };
        cur.kilos += p.kilosIngresados;
        cur.duracionHoras += p.duracionHoras;
        cur.cantidad += 1;
        cur.detalles.push({
            id: p.id,
            codigo: p.codigo,
            fecha: p.fecha.toISOString(),
            etapa: p.etapa ?? null,
            duracionHoras: p.duracionHoras,
            kilosIngresados: p.kilosIngresados,
            loteCodigo: p.Lote?.codigo ?? null,
        });
        porTipoProcesoMap.set(tipo, cur);
    }
    const porTipoProceso = Array.from(porTipoProcesoMap.values()).map((item) => ({
        ...item,
        duracionPromedio: item.cantidad > 0 ? Number((item.duracionHoras / item.cantidad).toFixed(1)) : 0,
    }));

    // 3. Desglose por Perfil de Secado
    const porPerfilSecadoMap = new Map<
        string,
        {
            perfil: string;
            kilosIngresados: number;
            kilosResultantes: number;
            merma: number;
            cantidad: number;
            detalles: {
                id: number;
                fechaInicio: string;
                fechaFin: string | null;
                kilosIngresados: number;
                kilosResultantes: number;
                merma: number;
                observaciones: string | null;
                loteCodigo: string | null;
            }[];
        }
    >();

    for (const s of secados) {
        const perfil = s.perfilProceso || "Sin perfil asignado";
        const cur = porPerfilSecadoMap.get(perfil) || { perfil, kilosIngresados: 0, kilosResultantes: 0, merma: 0, cantidad: 0, detalles: [] };
        cur.kilosIngresados += s.kilosIngresados;
        cur.kilosResultantes += s.kilosResultantes;
        cur.merma += s.merma;
        cur.cantidad += 1;
        cur.detalles.push({
            id: s.id,
            fechaInicio: s.fechaInicio.toISOString(),
            fechaFin: s.fechaFin ? s.fechaFin.toISOString() : null,
            kilosIngresados: s.kilosIngresados,
            kilosResultantes: s.kilosResultantes,
            merma: s.merma,
            observaciones: s.observaciones ?? null,
            loteCodigo: s.lote?.codigo ?? null,
        });
        porPerfilSecadoMap.set(perfil, cur);
    }

    const porPerfilSecado = Array.from(porPerfilSecadoMap.values()).map((item) => ({
        ...item,
        porcentajeMerma: item.kilosIngresados > 0 ? Number(((item.merma / item.kilosIngresados) * 100).toFixed(2)) : 0,
    }));

    // 4. Desglose por Calidad en Trilla
    const porCalidadTrillaMap = new Map<
        string,
        {
            calidad: string;
            kilosEnviados: number;
            kilosNetos: number;
            cantidad: number;
            detalles: {
                id: string;
                codigoTrilla: string;
                fechaDespacho: string;
                fechaIngreso: string | null;
                calidad: string | null;
                tipoSaco: string | null;
                kilosEnviados: number;
                kilosNetos: number | null;
                lotes: string[];
            }[];
        }
    >();

    for (const t of ordenesTrilla) {
        const calidad = t.calidad || "No especificada";
        const cur = porCalidadTrillaMap.get(calidad) || { calidad, kilosEnviados: 0, kilosNetos: 0, cantidad: 0, detalles: [] };
        cur.kilosEnviados += t.kilosEnviados;
        cur.kilosNetos += t.kilosNetos || 0;
        cur.cantidad += 1;
        cur.detalles.push({
            id: t.id,
            codigoTrilla: t.codigoTrilla,
            fechaDespacho: t.fechaDespacho.toISOString(),
            fechaIngreso: t.fechaIngreso ? t.fechaIngreso.toISOString() : null,
            calidad: t.calidad ?? null,
            tipoSaco: t.tipoSaco ?? null,
            kilosEnviados: t.kilosEnviados,
            kilosNetos: t.kilosNetos ?? null,
            lotes: t.lotes.map((l) => l.codigo),
        });
        porCalidadTrillaMap.set(calidad, cur);
    }
    const porCalidadTrilla = Array.from(porCalidadTrillaMap.values());

    return {
        ok: true,
        data: {
            resumen: {
                totalIngresadoProcesos,
                totalProcesos: procesos.length,
                duracionPromedioHoras: Number(duracionPromedioHoras.toFixed(1)),
                totalIngresadoSecado,
                totalResultanteSecado,
                totalMermaSecado,
                porcMermaSecadoPromedio: Number(porcMermaSecadoPromedio.toFixed(2)),
                totalKilosEnviadosTrilla,
                totalKilosNetosTrilla,
                totalOrdenesTrilla: ordenesTrilla.length,
                totalKilosVendidos,
                totalIngresosVentas,
                totalVentas: ventas.length,
            },
            porTipoProceso,
            porPerfilSecado,
            porCalidadTrilla,
        },
    };
}


