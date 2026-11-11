CREATE TYPE "WorkPackageStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD');
CREATE TYPE "ProgressUpdateStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

CREATE TABLE "work_packages" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "contractorOrgId" UUID NOT NULL,
    "assignedById" UUID NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "plannedWeight" DECIMAL(10,2) NOT NULL,
    "status" "WorkPackageStatus" NOT NULL DEFAULT 'PLANNED',
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "work_packages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "progress_updates" (
    "id" UUID NOT NULL,
    "workPackageId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "reviewedById" UUID,
    "workDate" DATE NOT NULL,
    "progressDelta" DECIMAL(5,2) NOT NULL,
    "description" TEXT NOT NULL,
    "photoMetadata" JSONB,
    "status" "ProgressUpdateStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "progress_updates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "progress_updates_workPackageId_workDate_submittedById_key" ON "progress_updates"("workPackageId", "workDate", "submittedById");
CREATE INDEX "work_packages_projectId_idx" ON "work_packages"("projectId");
CREATE INDEX "work_packages_contractorOrgId_idx" ON "work_packages"("contractorOrgId");
CREATE INDEX "work_packages_status_idx" ON "work_packages"("status");
CREATE INDEX "progress_updates_workPackageId_status_idx" ON "progress_updates"("workPackageId", "status");
CREATE INDEX "progress_updates_submittedById_idx" ON "progress_updates"("submittedById");

ALTER TABLE "work_packages" ADD CONSTRAINT "work_packages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_packages" ADD CONSTRAINT "work_packages_contractorOrgId_fkey" FOREIGN KEY ("contractorOrgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_packages" ADD CONSTRAINT "work_packages_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "progress_updates" ADD CONSTRAINT "progress_updates_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "work_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "progress_updates" ADD CONSTRAINT "progress_updates_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "progress_updates" ADD CONSTRAINT "progress_updates_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "work_packages" ADD CONSTRAINT "work_packages_plannedWeight_positive" CHECK ("plannedWeight" > 0);
ALTER TABLE "progress_updates" ADD CONSTRAINT "progress_updates_delta_range" CHECK ("progressDelta" > 0 AND "progressDelta" <= 100);
