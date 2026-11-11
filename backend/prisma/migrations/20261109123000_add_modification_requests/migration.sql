CREATE TYPE "ModificationRequestStatus" AS ENUM ('SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED');
CREATE TABLE "modification_requests" (
  "id" UUID NOT NULL, "bookingId" UUID NOT NULL, "projectId" UUID NOT NULL, "plotId" UUID NOT NULL,
  "buyerId" UUID NOT NULL, "contractorOrgId" UUID, "reviewedById" UUID, "assignedById" UUID,
  "status" "ModificationRequestStatus" NOT NULL DEFAULT 'SUBMITTED', "description" TEXT NOT NULL,
  "estimatedCost" DECIMAL(14,2), "deadline" TIMESTAMP(3), "reviewNote" TEXT, "completionEvidence" JSONB,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "reviewedAt" TIMESTAMP(3),
  "assignedAt" TIMESTAMP(3), "startedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3), "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "modification_requests_pkey" PRIMARY KEY ("id"));
CREATE TABLE "modification_request_history" (
  "id" UUID NOT NULL, "requestId" UUID NOT NULL, "performedById" UUID NOT NULL,
  "fromStatus" "ModificationRequestStatus", "toStatus" "ModificationRequestStatus" NOT NULL,
  "note" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "modification_request_history_pkey" PRIMARY KEY ("id"));
CREATE INDEX "modification_requests_bookingId_idx" ON "modification_requests"("bookingId");
CREATE INDEX "modification_requests_projectId_status_idx" ON "modification_requests"("projectId","status");
CREATE INDEX "modification_requests_buyerId_idx" ON "modification_requests"("buyerId");
CREATE INDEX "modification_requests_contractorOrgId_status_idx" ON "modification_requests"("contractorOrgId","status");
CREATE INDEX "modification_request_history_requestId_createdAt_idx" ON "modification_request_history"("requestId","createdAt");
ALTER TABLE "modification_requests" ADD CONSTRAINT "modification_requests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "modification_requests" ADD CONSTRAINT "modification_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "modification_requests" ADD CONSTRAINT "modification_requests_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "plots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "modification_requests" ADD CONSTRAINT "modification_requests_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "modification_requests" ADD CONSTRAINT "modification_requests_contractorOrgId_fkey" FOREIGN KEY ("contractorOrgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "modification_requests" ADD CONSTRAINT "modification_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "modification_requests" ADD CONSTRAINT "modification_requests_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "modification_request_history" ADD CONSTRAINT "modification_request_history_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "modification_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "modification_request_history" ADD CONSTRAINT "modification_request_history_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "modification_requests" ADD CONSTRAINT "modification_requests_estimatedCost_nonnegative" CHECK ("estimatedCost" IS NULL OR "estimatedCost" >= 0);
