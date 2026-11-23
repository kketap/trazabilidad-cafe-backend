CREATE TYPE "EstadoOrdenTrilla" AS ENUM ('EN_PROCESO', 'TERMINADO', 'DESPACHADO');

ALTER TABLE "OrdenTrilla"
  ADD COLUMN "estadoManual" "EstadoOrdenTrilla",
  ADD COLUMN "numeroGuiaHayland" TEXT,
  ADD COLUMN "exportable2" DOUBLE PRECISION,
  ADD COLUMN "exportable3" DOUBLE PRECISION,
  ADD COLUMN "exportable4" DOUBLE PRECISION;