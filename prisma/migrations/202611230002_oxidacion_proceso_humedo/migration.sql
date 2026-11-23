ALTER TABLE "ProcesoTrazabilidad"
  ADD COLUMN "inicioOxidacion" TIMESTAMP(3),
  ADD COLUMN "finOxidacion" TIMESTAMP(3),
  ADD COLUMN "tanqueOxidacion" TEXT;