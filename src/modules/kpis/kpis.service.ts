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
    return { mensaje: "En construcción" };
}
