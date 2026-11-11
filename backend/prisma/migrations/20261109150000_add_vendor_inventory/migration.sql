-- CreateEnum
CREATE TYPE "MaterialRequestStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'ORDERED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('ISSUED', 'PARTIALLY_DELIVERED', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('RECORDED', 'INSPECTED');

-- CreateEnum
CREATE TYPE "StockTransactionType" AS ENUM ('RECEIPT', 'ISSUE', 'CONSUMPTION', 'WASTAGE', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "materials" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "sku" VARCHAR(60) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_requests" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "contractorOrgId" UUID NOT NULL,
    "materialId" UUID NOT NULL,
    "raisedById" UUID NOT NULL,
    "reviewedById" UUID,
    "quantity" DECIMAL(14,3) NOT NULL,
    "status" "MaterialRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "vendorOrgId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'ISSUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_lines" (
    "id" UUID NOT NULL,
    "purchaseOrderId" UUID NOT NULL,
    "materialId" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitPrice" DECIMAL(14,2),

    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_deliveries" (
    "id" UUID NOT NULL,
    "purchaseOrderId" UUID NOT NULL,
    "vendorOrgId" UUID NOT NULL,
    "deliveryReference" VARCHAR(100) NOT NULL,
    "deliveredAt" TIMESTAMP(3) NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'RECORDED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_delivery_lines" (
    "id" UUID NOT NULL,
    "deliveryId" UUID NOT NULL,
    "purchaseOrderLineId" UUID NOT NULL,
    "deliveredQuantity" DECIMAL(14,3) NOT NULL,
    "acceptedQuantity" DECIMAL(14,3),
    "rejectedQuantity" DECIMAL(14,3),

    CONSTRAINT "material_delivery_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_receipts" (
    "id" UUID NOT NULL,
    "deliveryLineId" UUID NOT NULL,
    "inspectedById" UUID NOT NULL,
    "acceptedQuantity" DECIMAL(14,3) NOT NULL,
    "rejectedQuantity" DECIMAL(14,3) NOT NULL,
    "note" TEXT,
    "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_issues" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "contractorOrgId" UUID NOT NULL,
    "materialId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transactions" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "materialId" UUID NOT NULL,
    "type" "StockTransactionType" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "deliveryId" UUID,
    "receiptId" UUID,
    "issueId" UUID,
    "createdById" UUID NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "materials_organizationId_sku_key" ON "materials"("organizationId", "sku");

-- CreateIndex
CREATE INDEX "material_requests_projectId_status_idx" ON "material_requests"("projectId", "status");

-- CreateIndex
CREATE INDEX "material_requests_contractorOrgId_idx" ON "material_requests"("contractorOrgId");

-- CreateIndex
CREATE INDEX "purchase_orders_projectId_status_idx" ON "purchase_orders"("projectId", "status");

-- CreateIndex
CREATE INDEX "purchase_orders_vendorOrgId_idx" ON "purchase_orders"("vendorOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_lines_purchaseOrderId_materialId_key" ON "purchase_order_lines"("purchaseOrderId", "materialId");

-- CreateIndex
CREATE INDEX "material_deliveries_purchaseOrderId_idx" ON "material_deliveries"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "material_deliveries_vendorOrgId_deliveryReference_key" ON "material_deliveries"("vendorOrgId", "deliveryReference");

-- CreateIndex
CREATE UNIQUE INDEX "stock_receipts_deliveryLineId_key" ON "stock_receipts"("deliveryLineId");

-- CreateIndex
CREATE INDEX "material_issues_projectId_materialId_idx" ON "material_issues"("projectId", "materialId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_transactions_receiptId_key" ON "stock_transactions"("receiptId");

-- CreateIndex
CREATE INDEX "stock_transactions_projectId_materialId_createdAt_idx" ON "stock_transactions"("projectId", "materialId", "createdAt");

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_contractorOrgId_fkey" FOREIGN KEY ("contractorOrgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendorOrgId_fkey" FOREIGN KEY ("vendorOrgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_deliveries" ADD CONSTRAINT "material_deliveries_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_deliveries" ADD CONSTRAINT "material_deliveries_vendorOrgId_fkey" FOREIGN KEY ("vendorOrgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_delivery_lines" ADD CONSTRAINT "material_delivery_lines_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "material_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_delivery_lines" ADD CONSTRAINT "material_delivery_lines_purchaseOrderLineId_fkey" FOREIGN KEY ("purchaseOrderLineId") REFERENCES "purchase_order_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_receipts" ADD CONSTRAINT "stock_receipts_deliveryLineId_fkey" FOREIGN KEY ("deliveryLineId") REFERENCES "material_delivery_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_receipts" ADD CONSTRAINT "stock_receipts_inspectedById_fkey" FOREIGN KEY ("inspectedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_issues" ADD CONSTRAINT "material_issues_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_issues" ADD CONSTRAINT "material_issues_contractorOrgId_fkey" FOREIGN KEY ("contractorOrgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_issues" ADD CONSTRAINT "material_issues_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "stock_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "material_issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

