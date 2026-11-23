ALTER TABLE "Trabajador" ADD COLUMN "codigoInterno" TEXT;
CREATE UNIQUE INDEX "Trabajador_codigoInterno_key" ON "Trabajador"("codigoInterno");