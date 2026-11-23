-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EstadoLote" AS ENUM ('EN_PROCESO', 'EN_SECADO', 'EN_ALMACEN', 'TRILLADO', 'VENDIDO', 'CERRADO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "TipoCodigoLote" AS ENUM ('COMERCIAL', 'ESPECIAL', 'PERSONALIZADO');

-- CreateEnum
CREATE TYPE "PerfilSecado" AS ENUM ('HONEY', 'NATURAL', 'LAVADO');

-- CreateEnum
CREATE TYPE "TipoProceso" AS ENUM ('OXIDACION_CEREZA', 'OXIDACION_MUCILAGO', 'ANAEROBICO_CEREZA', 'ANAEROBICO_MUCILAGO');

-- CreateTable
CREATE TABLE "Cosecha" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "kilosCosechados" DOUBLE PRECISION NOT NULL,
    "lotes" TEXT NOT NULL,
    "totalHectareas" DOUBLE PRECISION NOT NULL,
    "tipoCosecha" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "varietal" TEXT,
    "observacion" TEXT,

    CONSTRAINT "Cosecha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fundo" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fundo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoteFisico" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "fundoId" INTEGER NOT NULL,
    "hectareas" DOUBLE PRECISION,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoteFisico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CosechaLoteFisico" (
    "id" SERIAL NOT NULL,
    "cosechaId" INTEGER NOT NULL,
    "loteFisicoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CosechaLoteFisico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lote" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT,
    "hectareas" DOUBLE PRECISION,
    "ubicacion" TEXT,
    "observacion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoLote" NOT NULL DEFAULT 'EN_PROCESO',
    "kilosActuales" DOUBLE PRECISION,
    "kilosIniciales" DOUBLE PRECISION,
    "saldoTemporal" DOUBLE PRECISION,
    "tipoCodigo" "TipoCodigoLote" NOT NULL DEFAULT 'COMERCIAL',
    "ordenTrillaId" TEXT,
    "gradosBrix" DOUBLE PRECISION,

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CosechaLote" (
    "id" SERIAL NOT NULL,
    "cosechaId" INTEGER NOT NULL,
    "loteId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kilosUsados" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "CosechaLote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcesoTrazabilidad" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "etapa" TEXT,
    "kilosIngresados" DOUBLE PRECISION NOT NULL,
    "cosechaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "loteId" INTEGER,
    "codigo" TEXT NOT NULL,
    "duracionHoras" DOUBLE PRECISION NOT NULL,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "tipoProceso" "TipoProceso",
    "finFermentacion" TIMESTAMP(3),
    "fueDespulpado" BOOLEAN,
    "fueLavado" BOOLEAN,
    "gradosBrix" DOUBLE PRECISION,
    "inicioFermentacion" TIMESTAMP(3),
    "nivelPh" DOUBLE PRECISION,
    "tanqueFermentacion" TEXT,
    "tempMaxima" DOUBLE PRECISION,
    "tempMinima" DOUBLE PRECISION,
    "kilosResultantes" DOUBLE PRECISION,

    CONSTRAINT "ProcesoTrazabilidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trabajador" (
    "id" SERIAL NOT NULL,
    "nombres" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "rol" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "apellidos" TEXT,
    "telefono" TEXT,

    CONSTRAINT "Trabajador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcesoLote" (
    "id" SERIAL NOT NULL,
    "procesoId" INTEGER NOT NULL,
    "loteId" INTEGER NOT NULL,
    "kilosUsados" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcesoLote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "direccion" TEXT,
    "dniRut" TEXT NOT NULL,
    "email" TEXT,
    "personaJuridica" BOOLEAN NOT NULL DEFAULT false,
    "telefono" TEXT,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CosechaTrabajador" (
    "id" SERIAL NOT NULL,
    "cosechaId" INTEGER NOT NULL,
    "trabajadorId" INTEGER NOT NULL,
    "kilosAsignados" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CosechaTrabajador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Secado" (
    "id" SERIAL NOT NULL,
    "loteId" INTEGER NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "kilosIngresados" DOUBLE PRECISION NOT NULL,
    "kilosResultantes" DOUBLE PRECISION NOT NULL,
    "merma" DOUBLE PRECISION NOT NULL,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "perfilProceso" "PerfilSecado",
    "secadora" TEXT,
    "tempMaxima" DOUBLE PRECISION,
    "tempMinima" DOUBLE PRECISION,
    "codigo" TEXT,

    CONSTRAINT "Secado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecadoLote" (
    "id" SERIAL NOT NULL,
    "secadoId" INTEGER NOT NULL,
    "loteId" INTEGER NOT NULL,
    "kilosUsados" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecadoLote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empaque" (
    "id" SERIAL NOT NULL,
    "loteId" INTEGER NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "kilosIngresados" DOUBLE PRECISION NOT NULL,
    "kilosResultantes" DOUBLE PRECISION NOT NULL,
    "merma" DOUBLE PRECISION NOT NULL,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "actividadAgua" DOUBLE PRECISION,
    "fueCatado" BOOLEAN,
    "humedad" DOUBLE PRECISION,
    "perfilSensorial" TEXT,
    "puntajeSca" DOUBLE PRECISION,
    "cantidadEmpaques" INTEGER,
    "rendimiento" DOUBLE PRECISION,
    "secadoId" INTEGER,
    "tipoEmpaque" TEXT,
    "codigo" TEXT,

    CONSTRAINT "Empaque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmpaqueSecado" (
    "id" SERIAL NOT NULL,
    "empaqueId" INTEGER NOT NULL,
    "secadoId" INTEGER NOT NULL,
    "kilosUsados" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmpaqueSecado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdenTrilla" (
    "id" TEXT NOT NULL,
    "codigoTrilla" TEXT NOT NULL,
    "fechaDespacho" TIMESTAMP(3) NOT NULL,
    "fechaIngreso" TIMESTAMP(3),
    "calidad" TEXT,
    "tipoSaco" TEXT,
    "kilosEnviados" DOUBLE PRECISION NOT NULL,
    "kilosNetos" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cascarilla" DOUBLE PRECISION,
    "cisco" DOUBLE PRECISION,
    "descarteMaquina" DOUBLE PRECISION,
    "exportable" DOUBLE PRECISION,
    "malla13" DOUBLE PRECISION,
    "numeroGuia" TEXT,
    "recuperado" DOUBLE PRECISION,
    "segundaBuena" DOUBLE PRECISION,
    "segundaMala" DOUBLE PRECISION,
    "sucioEscojo" DOUBLE PRECISION,
    "sacosEnviados" INTEGER,

    CONSTRAINT "OrdenTrilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdenTrillaLote" (
    "id" SERIAL NOT NULL,
    "ordenTrillaId" TEXT NOT NULL,
    "loteId" INTEGER NOT NULL,
    "kilosDescontados" DOUBLE PRECISION NOT NULL,
    "sacos" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrdenTrillaLote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" TEXT NOT NULL,
    "fechaVenta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "producto" TEXT NOT NULL,
    "kilosVendidos" DOUBLE PRECISION NOT NULL,
    "presentacionSacos" TEXT NOT NULL,
    "precioVentaKilo" DOUBLE PRECISION NOT NULL,
    "precioCompra" DOUBLE PRECISION,
    "numeroFactura" TEXT,
    "numeroGuiaRemision" TEXT,
    "fincaOrigen" TEXT,
    "clienteId" INTEGER NOT NULL,
    "ordenTrillaId" TEXT NOT NULL,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Fundo_codigo_key" ON "Fundo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "LoteFisico_codigo_key" ON "LoteFisico"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "LoteFisico_fundoId_numero_key" ON "LoteFisico"("fundoId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "CosechaLoteFisico_cosechaId_loteFisicoId_key" ON "CosechaLoteFisico"("cosechaId", "loteFisicoId");

-- CreateIndex
CREATE UNIQUE INDEX "Lote_codigo_key" ON "Lote"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "CosechaLote_cosechaId_loteId_key" ON "CosechaLote"("cosechaId", "loteId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "RefreshToken_usuarioId_idx" ON "RefreshToken"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcesoTrazabilidad_codigo_key" ON "ProcesoTrazabilidad"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Trabajador_dni_key" ON "Trabajador"("dni");

-- CreateIndex
CREATE INDEX "ProcesoLote_loteId_idx" ON "ProcesoLote"("loteId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcesoLote_procesoId_loteId_key" ON "ProcesoLote"("procesoId", "loteId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_dniRut_key" ON "Cliente"("dniRut");

-- CreateIndex
CREATE UNIQUE INDEX "CosechaTrabajador_cosechaId_trabajadorId_key" ON "CosechaTrabajador"("cosechaId", "trabajadorId");

-- CreateIndex
CREATE UNIQUE INDEX "Secado_codigo_key" ON "Secado"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "SecadoLote_secadoId_loteId_key" ON "SecadoLote"("secadoId", "loteId");

-- CreateIndex
CREATE UNIQUE INDEX "Empaque_codigo_key" ON "Empaque"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "EmpaqueSecado_empaqueId_secadoId_key" ON "EmpaqueSecado"("empaqueId", "secadoId");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenTrilla_codigoTrilla_key" ON "OrdenTrilla"("codigoTrilla");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenTrillaLote_ordenTrillaId_loteId_key" ON "OrdenTrillaLote"("ordenTrillaId", "loteId");

-- AddForeignKey
ALTER TABLE "LoteFisico" ADD CONSTRAINT "LoteFisico_fundoId_fkey" FOREIGN KEY ("fundoId") REFERENCES "Fundo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CosechaLoteFisico" ADD CONSTRAINT "CosechaLoteFisico_cosechaId_fkey" FOREIGN KEY ("cosechaId") REFERENCES "Cosecha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CosechaLoteFisico" ADD CONSTRAINT "CosechaLoteFisico_loteFisicoId_fkey" FOREIGN KEY ("loteFisicoId") REFERENCES "LoteFisico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_ordenTrillaId_fkey" FOREIGN KEY ("ordenTrillaId") REFERENCES "OrdenTrilla"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CosechaLote" ADD CONSTRAINT "CosechaLote_cosechaId_fkey" FOREIGN KEY ("cosechaId") REFERENCES "Cosecha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CosechaLote" ADD CONSTRAINT "CosechaLote_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcesoTrazabilidad" ADD CONSTRAINT "ProcesoTrazabilidad_cosechaId_fkey" FOREIGN KEY ("cosechaId") REFERENCES "Cosecha"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcesoTrazabilidad" ADD CONSTRAINT "ProcesoTrazabilidad_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcesoLote" ADD CONSTRAINT "ProcesoLote_procesoId_fkey" FOREIGN KEY ("procesoId") REFERENCES "ProcesoTrazabilidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcesoLote" ADD CONSTRAINT "ProcesoLote_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CosechaTrabajador" ADD CONSTRAINT "CosechaTrabajador_cosechaId_fkey" FOREIGN KEY ("cosechaId") REFERENCES "Cosecha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CosechaTrabajador" ADD CONSTRAINT "CosechaTrabajador_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Secado" ADD CONSTRAINT "Secado_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecadoLote" ADD CONSTRAINT "SecadoLote_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecadoLote" ADD CONSTRAINT "SecadoLote_secadoId_fkey" FOREIGN KEY ("secadoId") REFERENCES "Secado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Empaque" ADD CONSTRAINT "Empaque_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Empaque" ADD CONSTRAINT "Empaque_secadoId_fkey" FOREIGN KEY ("secadoId") REFERENCES "Secado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpaqueSecado" ADD CONSTRAINT "EmpaqueSecado_empaqueId_fkey" FOREIGN KEY ("empaqueId") REFERENCES "Empaque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpaqueSecado" ADD CONSTRAINT "EmpaqueSecado_secadoId_fkey" FOREIGN KEY ("secadoId") REFERENCES "Secado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenTrillaLote" ADD CONSTRAINT "OrdenTrillaLote_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenTrillaLote" ADD CONSTRAINT "OrdenTrillaLote_ordenTrillaId_fkey" FOREIGN KEY ("ordenTrillaId") REFERENCES "OrdenTrilla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_ordenTrillaId_fkey" FOREIGN KEY ("ordenTrillaId") REFERENCES "OrdenTrilla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
