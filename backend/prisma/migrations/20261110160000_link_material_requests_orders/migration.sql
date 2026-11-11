-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "materialRequestId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_materialRequestId_key" ON "purchase_orders"("materialRequestId");

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_materialRequestId_fkey" FOREIGN KEY ("materialRequestId") REFERENCES "material_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

