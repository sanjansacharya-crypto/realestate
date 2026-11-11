# Fieldstone Project Guide

This guide explains what the website does, how its parts work together, how to run it locally, and what is still incomplete. It is written for both developers and people exploring the product.

## 1. What this project is

Fieldstone is a real estate development and construction management platform. It brings a developer's projects, plots, buyer bookings, contractor work, material supply, attendance, and supporting records into one workspace.

The codebase has two main parts:

- **Frontend (`frontend/`)**: the browser website. It renders the screens and sends API requests.
- **Backend (`backend/`)**: the Node.js and Express API. It checks sign-in, organization membership, user roles, validates requests, applies business rules, and reads/writes PostgreSQL through Prisma.

The browser and API run as separate local services. The frontend does not connect directly to PostgreSQL.

```text
Browser (localhost:5173)
   │ HTTPS/JSON requests + access token + organization header
   ▼
Express API (localhost:5000/api/v1)
   │ Prisma ORM
   ▼
PostgreSQL / Supabase
```

## 2. Start the website locally

Open two terminals, both in the project folder.

**Terminal 1 — backend API:**

```powershell
cd backend
npm install
npx prisma generate
npm run dev
```

The backend listens at `http://localhost:5000`. Its health endpoint is `http://localhost:5000/api/v1/health`.

**Terminal 2 — frontend website:**

```powershell
cd frontend
npm start
```

Open `http://localhost:5173` in a browser. Keep both terminal sessions running while using the site. If the frontend opens but sign-in fails, check that the backend is also running and that the login form's API URL is `http://localhost:5000/api/v1`.

The frontend is plain JavaScript, HTML, and CSS; it has no npm runtime dependencies. `frontend/server.mjs` is a simple local development server, not a production hosting server.

## 3. Database and environment setup

The backend reads its private settings from `backend/.env`. This file is intentionally ignored by Git; do not commit it or paste database credentials into source code. `backend/.env.example` documents the variable names and safe placeholders.

Required/used settings include:

- `DATABASE_URL`: PostgreSQL connection URL used by Prisma at runtime, commonly the Supabase pooled URL.
- `DIRECT_URL`: direct PostgreSQL URL used for Prisma migrations.
- `PORT`: backend port, normally `5000`.
- `API_PREFIX`: API base path, normally `/api/v1`.
- `CORS_ORIGIN`: browser origins allowed by the backend.
- `JWT_ACCESS_SECRET`: private signing key for access tokens.

Apply pending database migrations with:

```powershell
cd backend
npx prisma migrate deploy
npx prisma migrate status
```

For a new local database in development, use the setup instructions in [README.md](README.md). Do not run `migrate reset` against a database with data you need; it deletes database data.

To create the demo accounts and sample project data, run `npm run seed` from `backend/`. Seeding is separate from starting the API. It may create or update database records.

## 4. Demo sign-in

The sign-in page contains an expandable **Developer demo accounts** section. Selecting a row fills the account email and shared password into the form.

All seeded demo accounts use `Password@123`:

| Role | Email | Typical use |
|---|---|---|
| Platform admin | `admin@platform.com` | Platform-wide administrative access |
| Developer | `developer@apexrealty.com` | Create projects, manage plots, bookings, contractors, and construction |
| Contractor | `contractor@buildwell.com` | View assigned work, submit progress, request materials, and manage attendance |
| Vendor | `vendor@steelcraft.com` | Record deliveries for assigned purchase orders |
| Buyer | `buyer@example.com` | View plots and manage own booking/modification requests |
| Employee | `employee@buildwell.com` | View assigned work and record site attendance |

These credentials are for local development/demo use only. They are not production credentials. Accounts must exist in the configured database; run the seed script if they are missing.

## 5. What happens when someone signs in

1. The frontend sends email and password to `POST /api/v1/auth/login`.
2. The backend validates the payload, checks the user, and verifies the password hash.
3. The backend returns the safe user profile and access/refresh tokens.
4. The frontend stores tokens in the current browser session and picks the default active organization membership.
5. Authenticated requests send `Authorization: Bearer <access token>` and `x-organization-id: <active organization id>`.
6. The backend resolves the active membership and checks the role and project assignment for every protected action.

Access tokens are short-lived. The frontend attempts to exchange an expired access token using the refresh token. Signing out calls the logout endpoint and clears browser session state. The frontend saves the API URL in local storage; credentials/tokens are not saved in source files.

## 6. Roles and organization boundaries

The same person may belong to more than one organization. The organization selector chooses which active membership is used for the current view. The frontend may hide controls based on a role, but **the backend is the real security boundary**: it must independently verify membership, role, project ownership, and assignment.

- **Developer**: manages projects owned by the developer organization and reviews buyer, contractor, and inventory workflows.
- **Contractor**: can access only projects where the contractor organization has an active project assignment. Contractor actions are restricted to that organization and its assigned scope.
- **Vendor**: can record deliveries against purchase orders issued to that vendor organization.
- **Buyer**: can access their own bookings and authorized project/property information.
- **Employee**: can access their own attendance and assigned project work.
- **Platform admin**: elevated administrative role; use only for administration and local demos.

Changing an ID in a URL or request body must never grant access by itself. The backend's authorization checks and relational ownership determine access.

## 7. Website screens

The sidebar provides these screens:

- **Overview**: project count, booking count, unread notices, project list, and quick navigation.
- **Projects**: browse projects; developers can create projects.
- **Plots & properties**: choose a project, inspect plots, and (for developers) create a plot.
- **Bookings**: review visible booking records; buyers can submit a booking request by choosing a project and supplying a plot ID.
- **Construction**: see work packages and approved progress summaries.
- **Materials**: browse the active organization's materials; developers can create materials; contractor users can raise a material request.
- **Modifications**: see visible modification requests; buyers can submit a request against a confirmed/completed booking.
- **Attendance**: employees can check in/out and review their own history. Optional evidence is not proof of physical presence.
- **Documents**: inspect private document metadata when authorized.
- **Notifications**: read and mark the signed-in user's notifications as read.
- **Settings**: change the backend API URL and run a health check.

The screens intentionally expose only a subset of the backend's operations. Some backend workflows need additional frontend forms before the whole workflow can be completed from the browser.

## 8. Main business workflows

### Projects and property sales

Developers create a project, assign contractors/vendors, add plots, and review buyer booking requests. Booking requests use server-side plot locking to prevent two buyers from reserving the same available plot simultaneously. Payments are records that require developer verification; a buyer cannot mark a payment as successful on their own.

### Construction progress

The developer creates weighted work packages and assigns them to active project contractors. Contractors submit dated progress increments and optional photo metadata. A developer reviews each update. Work package and project progress is derived from approved updates, not accepted as a client-supplied total percentage.

### Buyer modifications

Buyers submit requests against their own confirmed/completed bookings. Sellers review, approve/reject, and may assign an active project contractor. The contractor starts and completes assigned work with evidence metadata. Status transitions are retained in history.

### Materials and stock

Contractors raise requests; the seller reviews and can issue purchase orders to assigned vendors. Vendors record deliveries. The seller inspects delivered quantities and accepted stock creates receipt ledger entries. Sellers issue material to contractors; contractors record consumption or wastage. Stock balance is computed from ledger transactions, not stored as an editable quantity.

### Attendance

Employees check in/out for assigned projects. Location and photo evidence are optional and must not be treated as proof of presence. Employees can request a manual time correction; an authorized employer contractor reviews it.

## 9. Technical map

| Area | Location | Responsibility |
|---|---|---|
| Express app and route mounting | `backend/src/app.ts` | Middleware and `/api/v1` route groups |
| Runtime settings | `backend/src/config/env.ts` | Environment parsing and validation |
| Prisma schema | `backend/prisma/schema.prisma` | Enums, models, relationships, indexes |
| Migrations | `backend/prisma/migrations/` | Versioned PostgreSQL schema changes |
| Auth | `backend/src/modules/auth/` | Registration, login, token refresh/revocation, current profile |
| Tenant/role middleware | `backend/src/middleware/authorize.ts` | Organization membership and role checks |
| Projects, plots, bookings | `backend/src/modules/projects/`, `plots/`, `bookings/` | Property and sales workflows |
| Work packages | `backend/src/modules/work/` | Contractor assignments and progress review |
| Modifications | `backend/src/modules/modifications/` | Buyer request lifecycle |
| Inventory | `backend/src/modules/inventory/` | Requests, orders, delivery, inspection, ledger |
| Attendance | `backend/src/modules/attendance/` | Check-in/out and correction review |
| Supporting services | `backend/src/modules/support/` | Private metadata, notifications, audit listing |
| Frontend | `frontend/` | Browser screens, API requests, local development server |

The API uses JSON request/response bodies, Zod input validation, Prisma, and PostgreSQL. Success responses generally use `{ success: true, data: ... }`; errors use `{ success: false, error: { message, ... } }`.

## 10. Commands developers use

```powershell
# In backend/
npm run dev             # Start API with watch mode
npm run type-check      # TypeScript check without emitting output
npm run build           # Compile production backend to dist/
npm test                # Run Vitest test suite
npx prisma generate     # Regenerate Prisma client after schema changes
npx prisma validate     # Validate Prisma schema
npx prisma migrate status
npx prisma migrate deploy
npm run seed            # Seed demo users/sample records

# In frontend/
npm start               # Start local browser frontend at localhost:5173
```

## 11. Current limitations

- The frontend is a lightweight vanilla JavaScript interface. It is not a production server-side-rendered application.
- The frontend does not yet expose every backend action: for example, full seller booking review/payment verification, work package creation/update/review, purchase-order creation, vendor delivery entry, inspection, stock issue, and correction review need richer UI workflows.
- Document support registers and reads metadata only. File upload/download and a storage provider are not implemented.
- Notifications are in-app records. The backend does not provide an email, SMS, or push dispatcher, and event-to-notification coverage is limited.
- API documentation and security hardening are still an active follow-up; the current OpenAPI file is not an exhaustive contract for every endpoint.
- Passing local checks does not establish production readiness. Deployment configuration, secrets management, monitoring, backups, threat review, and operational procedures need separate work.

## 12. Troubleshooting

**The browser says “localhost refused to connect.”** Start the frontend with `npm start` in `frontend/`; keep that terminal open.

**The sign-in button cannot reach the API.** Start `npm run dev` in `backend/`, confirm the API URL is `http://localhost:5000/api/v1`, and visit `/api/v1/health` on the backend.

**Sign-in returns invalid credentials.** Confirm the configured database is the expected one and run `npm run seed` from `backend/` if the demo users have not been created.

**A page returns 403/404.** Verify the active organization selector and the user's membership/role. Also confirm the user is assigned to that project or booking as required.

**Changes to Prisma models do not appear in the database.** Run `npx prisma generate` after schema edits and apply the matching migration; client generation does not apply database migrations.

---

For the phase-by-phase implementation rules, see [BACKEND_BUILD_GUIDE.md](BACKEND_BUILD_GUIDE.md). For endpoint-level examples, see [backend/docs/openapi.yaml](backend/docs/openapi.yaml).
