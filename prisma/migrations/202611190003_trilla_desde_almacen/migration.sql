ALTER TABLE "OrdenTrilla" ADD COLUMN "empaqueId" INTEGER;
CREATE INDEX "OrdenTrilla_empaqueId_idx" ON "OrdenTrilla"("empaqueId");
ALTER TABLE "OrdenTrilla" ADD CONSTRAINT "OrdenTrilla_empaqueId_fkey"
  FOREIGN KEY ("empaqueId") REFERENCES "Empaque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;