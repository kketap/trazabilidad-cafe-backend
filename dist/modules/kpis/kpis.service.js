"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.obtenerKpisCosechas = obtenerKpisCosechas;
exports.obtenerKpisTrazabilidad = obtenerKpisTrazabilidad;
// src/modules/kpis/kpis.service.ts
const prisma_1 = require("../../config/prisma");
async function obtenerKpisCosechas() {
    const cosechas = await prisma_1.prisma.cosecha.findMany({
        orderBy: { fecha: "asc" },
    });
    const totalesPorMes = new Map();
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
        const porcentaje = kilosTotalesMes > 0
            ? Number(((cosecha.kilosCosechados / kilosTotalesMes) * 100).toFixed(2))
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
async function obtenerKpisTrazabilidad() {
    return { mensaje: "En construcción" };
}
//# sourceMappingURL=kpis.service.js.map