# Real Estate & Construction Management Platform

## Frontend

Run `npm run dev` in `backend`, then `npm start` in `frontend` and open `http://localhost:5173`. See [frontend setup](frontend/README.md).

An integrated multi-tenant real-estate development and construction management platform built with a modular monolith architecture using Node.js, Express, TypeScript, PostgreSQL (Supabase), and Prisma ORM.

---

## 1. Project Overview & Architecture

- **Architecture:** Modular Monolith with strict organization-level tenant boundaries.
- **Runtime & Language:** Node.js (v20+ / v24 LTS) with TypeScript (strict mode).
- **Database & ORM:** PostgreSQL (hosted on Supabase) with Prisma ORM (pooled `DATABASE_URL` via pgBouncer + `DIRECT_URL` for migrations).
- **Validation:** Runtime schema validation using Zod on every endpoint.
- **Authentication:** Password hashing via bcrypt (12 salt rounds), short-lived JWT access tokens (15m), and SHA-256 hashed refresh tokens with rotation and revocation.
- **Authorization:** Role-Based Access Control (RBAC) and tenant isolation middleware preventing cross-organization parameter tampering and ID swapping.
- **Test Suite:** 168 automated unit and integration tests passing in Vitest, including Phase 12–13 validation coverage.

---

## 2. Implementation Progress (Completed vs Pending)

### ✅ Completed Phases (Phases 0 – 14)

| Phase | Module | Summary of Completed Capabilities | Applied Migration |
|---|---|---|---|
| **Phase 0** | **Technical Stack & Architecture** | Modular monolith design, schema layout, dependency justification. | — |
| **Phase 1** | **Backend Foundation Skeleton** | Express app, Zod environment validation, central error handling, 404 handler, request logging, and health endpoint (`GET /api/v1/health`). | — |
| **Phase 2** | **Database & Migrations** | PostgreSQL connection via Prisma, connection pooling + direct URL handling, connection health probes suppressing internal credentials. | — |
| **Phase 3** | **Identity & Organization Models** | `User`, `Organization`, and `OrganizationMembership` models. Enums for `Role`, `OrganizationType`, and `MembershipStatus`. Unique constraints and cascading deletes. | `20261101160355_init_identity_schema` |
| **Phase 4** | **Authentication & Sessions** | `RefreshToken` model with SHA-256 hashing. User registration, login, token rotation, logout revocation, authenticated profile (`GET /api/v1/auth/me`), rate limiting, anti-enumeration security. | `20261101181240_add_refresh_tokens` |
| **Phase 5** | **Authorization & Tenant Isolation** | Reusable middleware (`requireOrganization`, `requireRole`, `requirePlatformAdmin`, `requireOrganizationRole`). Tested anti-tampering guards ensuring users cannot access another tenant's resources by swapping IDs in URLs, headers, queries, or bodies. | — |
| **Phase 6** | **Project Management** | Central `Project` model with location, RERA registration, area, and timelines. CRUD APIs, organization scoping, unique `[organizationId, code]`, soft archival (`ARCHIVED`). | `20261109051314_add_project_model` |
| **Phase 7** | **Project Memberships & Assignments** | `ProjectOrganizationAssignment` (Contractors & Vendors linked to projects) and `ProjectMember` (personnel, site engineers, supervisors, buyers). Role delegation and least-privilege scoping. | `20261109051951_add_project_memberships_and_assignments` |
| **Phase 8** | **Plot & Property Inventory** | `Plot` model with explicit statuses (`AVAILABLE`, `TEMPORARILY_RESERVED`, `BOOKING_PENDING`, `BOOKED`, `SOLD`, `BLOCKED`). Dimensions, facings, financial decimals, corner/park premiums, bulk creation, and deletion protection on booked/sold plots. | `20261109053508_add_plot_model` |
| **Phase 9** | **Buyer Enquiries & Booking Lifecycle** | `Booking`, `PaymentRecord`, and `BookingAuditLog` models. **Airtight concurrency control against double-booking** using database-level conditional locking. Complete state machine, verifiable payment ledger (no client fake success), review hold, confirmation, and cancellation. | `20261109055120_add_booking_and_payment_models` |
| **Phase 10** | **Contractor Work Packages & Construction Progress** | Weighted packages assigned to active project contractors, dated updates with photo metadata, seller review, and weighted summaries derived from approved incremental progress. | `20261109062000_add_contractor_work_progress` |
| **Phase 11** | **Buyer Modification Requests** | Booking-linked requests with seller review, active contractor assignment, contractor work/completion evidence, and immutable state history. | `20261109123000_add_modification_requests` |
| **Phase 12** | **Vendor Orders & Material Inventory** | Material requests linked to purchase orders, partial deliveries, inspection receipts, contractor issues, consumption/wastage, and derived stock ledger balances. | `20261109150000_add_vendor_inventory`, `20261110160000_link_material_requests_orders` |
| **Phase 13** | **Employee Assignments & Attendance** | Assigned employees can check in/out, attach optional evidence, request correction and view their attendance; employer contractor users review corrections. | `20261110110000_add_attendance` |
| **Phase 14** | **Supporting Platform Capabilities** | Private file metadata, per-user in-app notifications, and organization/project audit events. | `20261110140000_support_capabilities` |

---

### ⏳ Phase 15 Review Status

The following modules remain to be built according to `BACKEND_BUILD_GUIDE.md`:

| Phase | Module | Scope & Core Requirements |
|---|---|---|
| **Phase 15** | **Hardening & Documentation** | Draft OpenAPI documentation and known limitations are recorded. A full route-by-route security review and new cross-tenant end-to-end tests remain outstanding. |

---

## 3. Seeded Test Accounts for Each Interface

The database has been seeded with dedicated accounts for every interface on the platform. All accounts use the standard password: `Password@123`.

| Interface / Portal | Email | Password | Role | Organization | Seeded Capabilities / Context |
|---|---|---|---|---|---|
| **Platform Admin** | `admin@platform.com` | `Password@123` | `SUPERADMIN` | Global Platform | Global administrative access across all tenants. |
| **Seller / Developer** | `developer@apexrealty.com` | `Password@123` | `DEVELOPER` | Apex Realty Developers | Owns project `GFM-01`, manages plots, reviews bookings, verifies payments. |
| **Contractor** | `contractor@buildwell.com` | `Password@123` | `CONTRACTOR` | BuildWell Infrastructure | Assigned to `GFM-01` for road & civil works; manages site staff. |
| **Vendor** | `vendor@steelcraft.com` | `Password@123` | `VENDOR` | SteelCraft Supplies | Assigned to `GFM-01` for cement and steel supply. |
| **Buyer** | `buyer@example.com` | `Password@123` | `BUYER` | Apex Realty Developers | Discovers available plots, submits booking requests, tracks payments. |
| **Employee** | `employee@buildwell.com` | `Password@123` | `EMPLOYEE` | BuildWell Infrastructure | Site Engineer on `GFM-01` under BuildWell Infrastructure. |

### Sample Data Pre-Seeded in Database:
- **Project:** Greenfield Meadows Phase 1 (Code: `GFM-01`, Bengaluru, Karnataka)
- **Plots in GFM-01:**
  - `P-101`: `AVAILABLE` — Corner plot, 2,400 sq.ft, East-facing, ₹48,00,000
  - `P-102`: `AVAILABLE` — Park-facing plot, 1,500 sq.ft, North-facing, ₹30,00,000
  - `P-103`: `TEMPORARILY_RESERVED` — Standard plot, 1,200 sq.ft, West-facing, ₹24,00,000
  - `P-104`: `BOOKED` — Villa plot, 2,400 sq.ft, East-facing, ₹50,40,000
  - `P-105`: `SOLD` — Standard plot, 1,200 sq.ft, South-facing, ₹24,00,000
  - `P-106`: `BLOCKED` — Commercial plot, 3,200 sq.ft, North-East facing, ₹80,00,000

---

## 4. API Endpoint Catalogue

All endpoints are versioned under `/api/v1`.

### Health & Auth
- `GET /api/v1/health` — Service health & database latency probe.
- `POST /api/v1/auth/register` — Register user & optional company.
- `POST /api/v1/auth/login` — Login with credentials, returns JWT tokens.
- `POST /api/v1/auth/refresh` — Rotate refresh token for new access token.
- `POST /api/v1/auth/logout` — Revoke active refresh session.
- `GET /api/v1/auth/me` — Authenticated profile & active organization memberships.

### Projects & Organization Assignments
- `POST /api/v1/projects` — Create project (`DEVELOPER` only).
- `GET /api/v1/projects` — List projects scoped to user's organization.
- `GET /api/v1/projects/:id` — Get project details.
- `PATCH /api/v1/projects/:id` — Update project metadata.
- `DELETE /api/v1/projects/:id` — Soft-archive project.
- `POST /api/v1/projects/:id/organizations` — Assign Contractor/Vendor company to project.
- `GET /api/v1/projects/:id/organizations` — List assigned external companies.
- `PATCH /api/v1/projects/:id/organizations/:orgId` — Update company assignment status/scope.
- `POST /api/v1/projects/:id/members` — Assign internal team, site engineer, or supervisor.
- `GET /api/v1/projects/:id/members` — List assigned project personnel.
- `DELETE /api/v1/projects/:id/members/:userId` — Remove/deactivate member assignment.

### Plot Inventory
- `POST /api/v1/projects/:projectId/plots` — Create individual plot (`DEVELOPER` only).
- `POST /api/v1/projects/:projectId/plots/bulk` — Bulk import plots for a project block/sector.
- `GET /api/v1/projects/:projectId/plots` — Filter plots (Buyers only see `AVAILABLE` plots).
- `GET /api/v1/projects/:projectId/plots/:id` — Get plot details.
- `PATCH /api/v1/projects/:projectId/plots/:id` — Update plot pricing, facing, or status.
- `DELETE /api/v1/projects/:projectId/plots/:id` — Soft-delete plot (protected if `BOOKED` or `SOLD`).

### Bookings & Payments
- `POST /api/v1/bookings` — Buyer submits booking request (concurrent lock on plot).
- `GET /api/v1/bookings` — List bookings (Buyers see own; Developers see all in project).
- `GET /api/v1/bookings/:id` — Get booking with payment ledger & audit history.
- `PATCH /api/v1/bookings/:id/review` — Developer approves hold or rejects request.
- `POST /api/v1/bookings/:id/payments` — Record payment transaction with reference.
- `PATCH /api/v1/bookings/:id/payments/:paymentId/verify` — Developer verifies/rejects payment.
- `PATCH /api/v1/bookings/:id/confirm` — Developer confirms booking (marks plot `BOOKED`).
- `PATCH /api/v1/bookings/:id/cancel` — Buyer or Developer cancels booking (releases plot).

### Contractor Work & Construction Progress
- `POST /api/v1/projects/:projectId/work-packages` — Developer creates a weighted work package assigned to an active project contractor.
- `GET /api/v1/projects/:projectId/work-packages` — List project packages and updates.
- `GET /api/v1/projects/:projectId/work-packages/summary` — View package progress and weighted project progress.
- `GET /api/v1/work-packages` — List packages visible to the authenticated organization.
- `PATCH /api/v1/work-packages/:id` — Developer edits package metadata, deadline, weight, or status.
- `POST /api/v1/work-packages/:id/progress` — Assigned contractor submits a dated update with optional photo metadata.
- `PATCH /api/v1/work-packages/:id/progress/:updateId/review` — Developer approves or rejects an update with a note.

### Buyer Modification Requests
- `POST /api/v1/modification-requests` — Buyer submits a request against their own confirmed/completed booking.
- `GET /api/v1/modification-requests` and `GET /api/v1/modification-requests/:id` — List or retrieve requests visible to the buyer, seller, or assigned contractor.
- `PATCH /api/v1/modification-requests/:id/review` — Seller approves or rejects with a note and optional estimate/deadline.
- `PATCH /api/v1/modification-requests/:id/assign` — Seller assigns an actively assigned project contractor.
- `PATCH /api/v1/modification-requests/:id/start` and `/complete` — Assigned contractor starts and completes work with evidence metadata.
- `PATCH /api/v1/modification-requests/:id/cancel` — Buyer or seller cancels before completion, subject to lifecycle rules.

### Vendor Orders & Inventory
- `POST /api/v1/inventory/materials`, `GET /api/v1/inventory/materials` — Seller maintains its project material catalog.
- `POST /api/v1/inventory/projects/:projectId/requests` — Assigned contractor requests material.
- `PATCH /api/v1/inventory/requests/:id/review` — Seller approves/rejects a request.
- `POST /api/v1/inventory/projects/:projectId/orders` — Seller issues an order to an assigned vendor.
- `POST /api/v1/inventory/orders/:id/deliveries` — Vendor records a delivery; references are unique per vendor.
- `PATCH /api/v1/inventory/delivery-lines/:id/inspect` — Seller records accepted and rejected quantities; accepted quantity creates a stock receipt transaction.
- `POST /api/v1/inventory/issues` — Seller issues available stock to an assigned contractor.
- `GET /api/v1/inventory/projects/:projectId/materials/:materialId/ledger` — Derive available stock from ledger transactions.
- `POST /api/v1/inventory/issues/:id/consumption` and `/wastage` — Contractor records use against an issue.

### Attendance
- `POST /api/v1/attendance/check-in`, `PATCH /api/v1/attendance/:id/check-out` — Employee records attendance with optional evidence.
- `GET /api/v1/attendance` — Employee's history (assigned contractor users may request scoped oversight).
- `POST /api/v1/attendance/:id/corrections`, `PATCH /api/v1/attendance/corrections/:id/review` — Correction request and employer review.

### Supporting services
- `POST /api/v1/support/documents`, `GET /api/v1/support/documents/:id` — Store/access-check private document metadata.
- `GET /api/v1/support/notifications`, `PATCH /api/v1/support/notifications/:id/read` — Per-user in-app notification inbox.
- `GET /api/v1/support/audit` — Organization-scoped audit event history.

OpenAPI draft: `backend/docs/openapi.yaml`.

## Known limitations
- Document routes register metadata and storage keys only; file upload/download and a storage provider are not implemented.
- Notifications are in-app records only; there is no email, SMS, or push dispatcher.
- Attendance evidence is optional and is not proof of physical presence; there is no offline sync or biometric feature.
- Inventory does not integrate vendor invoicing or supplier payments. Unit strings are catalog-defined; quantities use three decimal places.
- The Phase 15 review does not establish production readiness; deployment, backups, monitoring, and operational review remain separate work.

---

## 5. Developer Quick Start & Operations

### Prerequisites
- Node.js (v20+ or v24 LTS)
- npm

### Setup
```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Environment configuration
cp .env.example .env
# Ensure DATABASE_URL and DIRECT_URL point to your PostgreSQL / Supabase instance

# 4. Generate Prisma client & apply migrations
npx prisma generate
npx prisma migrate dev

# 5. Seed the database with all test roles, project, and plots
npm run seed

# 6. Start development server with hot-reload
npm run dev
```

### Running Checks & Tests
```bash
# Run TypeScript type-check without emitting files
npm run type-check

# Compile production TypeScript build to dist/
npm run build

# Run full Vitest test suite (123 tests)
npm test
```

---

## 6. Instructions for AI Coding Agents Continuing This Project

When continuing work on this codebase in a new session or with another agent:
1. Treat `BACKEND_BUILD_GUIDE.md` as the strict source of truth for phases and non-negotiable rules.
2. The immediate next phase to implement is **Phase 12: Vendor Orders and Material Inventory**.
3. Do not invent custom architectures or leapfrog phases. Complete one phase at a time, implement validation schemas, service logic, routes, and comprehensive tests, and run `npm run type-check` and `npm test` before concluding.
