-- CreateEnum
CREATE TYPE "PlotStatus" AS ENUM ('AVAILABLE', 'TEMPORARILY_RESERVED', 'BOOKING_PENDING', 'BOOKED', 'SOLD', 'BLOCKED');

-- CreateEnum
CREATE TYPE "PlotFacing" AS ENUM ('NORTH', 'SOUTH', 'EAST', 'WEST', 'NORTH_EAST', 'NORTH_WEST', 'SOUTH_EAST', 'SOUTH_WEST');

-- CreateEnum
CREATE TYPE "PlotType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'CORNER', 'VILLA_PLOT', 'PARK_FACING');

-- CreateTable
CREATE TABLE "plots" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "plotNumber" VARCHAR(50) NOT NULL,
    "plotType" "PlotType" NOT NULL DEFAULT 'RESIDENTIAL',
    "status" "PlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "area" DECIMAL(12,2) NOT NULL,
    "areaUnit" "AreaUnit" NOT NULL DEFAULT 'SQ_FT',
    "length" DECIMAL(8,2),
    "width" DECIMAL(8,2),
    "facing" "PlotFacing",
    "block" VARCHAR(50),
    "sector" VARCHAR(50),
    "layoutReference" VARCHAR(100),
    "basePricePerUnit" DECIMAL(14,2),
    "totalPrice" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "isCornerPlot" BOOLEAN NOT NULL DEFAULT false,
    "isParkFacing" BOOLEAN NOT NULL DEFAULT false,
    "premiumCharges" DECIMAL(14,2) DEFAULT 0,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plots_projectId_idx" ON "plots"("projectId");

-- CreateIndex
CREATE INDEX "plots_status_idx" ON "plots"("status");

-- CreateIndex
CREATE INDEX "plots_plotType_idx" ON "plots"("plotType");

-- CreateIndex
CREATE INDEX "plots_totalPrice_idx" ON "plots"("totalPrice");

-- CreateIndex
CREATE UNIQUE INDEX "plots_projectId_plotNumber_key" ON "plots"("projectId", "plotNumber");

-- AddForeignKey
ALTER TABLE "plots" ADD CONSTRAINT "plots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
