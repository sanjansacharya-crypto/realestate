# Real Estate Platform --- Backend Build Instructions for Antigravity

> **Purpose:** Build the backend in small, reviewable stages. The AI
> coding agent must complete only the current phase, explain its work,
> run the relevant checks, and wait for approval before moving on.
>
> **How to use:** Save this file in the root of your project as
> `BACKEND_BUILD_GUIDE.md`. In Antigravity, open the project folder and
> send the **Session Start Prompt** below. Then send one phase prompt at
> a time. Do not ask the agent to execute the entire document in one go.

------------------------------------------------------------------------

# 1. Product context

We are building an integrated real-estate development and construction
management platform.

The platform has these user types:

-   **Platform Admin:** manages the platform and organizations.
-   **Seller / Developer:** manages their real-estate projects, plots,
    buyers, contractors, vendors, construction information and
    announcements.
-   **Buyer:** discovers projects and plots, submits booking requests,
    tracks payments, documents, construction updates and handover.
-   **Contractor:** accesses projects assigned to their organization,
    manages work packages and employees, submits progress updates and
    material requests.
-   **Vendor:** receives material orders, records deliveries and
    invoices, and views relevant purchase/order information.
-   **Employee:** views assigned work and submits attendance and work
    updates.

The platform must use a shared backend and central database. Users must
only access data they are authorized to see. In particular, one
real-estate company must not be able to access another company's private
projects, buyers, contractors, vendors, bookings or inventory.

## Important domain principles

1.  A **Project** is the central parent entity connecting plots, buyers,
    contractors, vendors and construction activity.
2.  A plot must not be booked by two buyers at the same time.
3.  Plot availability must be represented by explicit statuses, not
    inferred from a missing buyer record.
4.  Booking, payment and plot sale are related but distinct concepts.
5.  Material stock must be calculated from recorded stock transactions.
    Do not simply overwrite a stock quantity.
6.  A material delivery, material receipt/inspection, material issue to
    a work site, consumption and wastage are separate events.
7.  Construction progress should ultimately be supported by work
    packages/tasks and reviewed progress updates, not just an arbitrary
    percentage.
8.  Buyer modification requests need a trackable approval and completion
    lifecycle.
9.  Important actions should be auditable.
10. Do not integrate a real payment gateway, SMS provider, email
    provider, map provider or cloud file-storage provider until
    separately approved.

------------------------------------------------------------------------

# 2. Recommended technical direction

Use a **modular monolith** for the first version. Do not introduce
microservices.

Recommended stack, subject to the Phase 0 review:

-   Runtime: Node.js, using a currently supported LTS release compatible
    with the project environment.
-   Language: TypeScript.
-   HTTP framework: Express.
-   API style: REST, versioned under `/api/v1`.
-   Database: PostgreSQL.
-   ORM and migrations: Prisma.
-   Validation: Zod.
-   Authentication: secure password hashing with Argon2id or another
    well-maintained password-hashing library; short-lived access tokens
    and a carefully designed refresh-token/session strategy.
-   Automated tests: Vitest or Jest, plus Supertest for HTTP integration
    tests.
-   Logging: structured server-side logging.
-   Security: Helmet, strict CORS configuration, request validation,
    rate limiting on sensitive endpoints, safe error handling.
-   API documentation: OpenAPI/Swagger once the first stable endpoints
    exist.
-   Local development: `.env` for secrets and a documented local
    PostgreSQL setup. Docker Compose may be proposed if useful.

Do not install everything immediately. Choose and justify dependencies
in Phase 0, then add only what the current phase needs.

If the repository already has a working stack, inspect it and propose
whether to preserve it or migrate. Do not replace working code or change
the stack without approval.

------------------------------------------------------------------------

# 3. Non-negotiable working rules for the coding agent

Follow these rules for every phase.

1.  **One phase at a time.** Do not implement future phases, even if
    their tables or routes seem obvious.
2.  Before editing, inspect the existing repository, its `README`,
    package files, source code, Git status and existing tests.
3.  Never delete, overwrite or restructure existing working files
    without explaining why and obtaining approval.
4.  Do not invent product requirements. If a business rule is unclear,
    ask a concise question and wait.
5.  Keep the implementation understandable for a student developer.
    Prefer clear, conventional code over clever abstractions.
6.  Use TypeScript types and runtime validation. Never assume that
    TypeScript types validate incoming HTTP requests.
7.  Keep route handlers thin. Separate routing, validation, business
    logic/services and database access in a proportionate way.
8.  Never trust a user ID, organization ID, role, price, plot status or
    permission sent by the client without checking it against
    authenticated server-side data.
9.  Enforce organization/tenant isolation in backend queries and service
    logic, not just by hiding frontend controls.
10. Never commit secrets, `.env` files, passwords, tokens, private keys
    or real customer data.
11. Do not use fake success responses, hard-coded production data or
    in-memory arrays as a substitute for persistent database
    functionality.
12. Do not add a feature merely because it is listed in a later phase.
13. Add tests for the current phase. Do not claim a test passed unless
    you actually ran it and saw it pass.
14. Run formatting, linting, type-checking and relevant tests before
    declaring a phase complete.
15. If a command fails, show the relevant error, explain the likely
    cause and fix only what is within the current phase.
16. Keep `main` stable. Work on a feature branch and do not push, merge,
    publish or deploy unless the user explicitly asks.
17. Do not run destructive database commands or reset migrations/data
    without explicit approval.
18. At the end of each phase, provide:
    -   What was implemented.
    -   Files created or changed.
    -   Commands/dependencies used.
    -   Tests/checks run and their actual results.
    -   Any assumptions or unresolved questions.
    -   How the user can manually verify the result.
    -   The exact next phase that is ready, without starting it.
19. Stop and wait for the user's approval before proceeding to the next
    phase.

------------------------------------------------------------------------

# 4. Session Start Prompt

Send this prompt first in Antigravity:

``` text
You are helping me build the backend for a real-estate development and construction management platform.

First, read the entire BACKEND_BUILD_GUIDE.md file in the project root. Treat it as the project brief and staged implementation plan.

IMPORTANT:
- Do not build the entire backend now.
- Do not start implementing any feature yet.
- Start with Phase 0 only.
- Inspect the existing repository and Git status before proposing changes.
- Preserve existing working code.
- Follow the non-negotiable working rules in the guide.
- If a requirement is unclear, ask me instead of guessing.
- Do not install dependencies, modify files, create migrations or run destructive commands during this initial review.

For now, report:
1. What currently exists in this repository.
2. Whether it is empty or already has an application.
3. The current runtime, language, framework and package manager, if detectable.
4. Whether Git is initialized and which branch is checked out.
5. Any risks or existing files that must be preserved.
6. Whether the recommended stack in the guide is suitable, or whether you recommend changes, with reasons.
7. The exact next actions you propose for Phase 0.

Then stop and wait for my approval.
```

------------------------------------------------------------------------

# 5. Phased implementation prompts

## Phase 0 --- Repository audit and technical decisions

**Goal:** Understand the repository and agree on the stack before
changing anything.

``` text
Execute Phase 0 of BACKEND_BUILD_GUIDE.md only.

Inspect the repository, current Git status, existing source files, package configuration, scripts, environment files and tests. Do not modify files or install packages yet.

Evaluate the recommended stack in the guide against the existing project. Recommend a backend folder structure and explain the purpose of each major folder. Identify any decisions that need my approval.

Do not implement the backend in this phase. Do not create a database schema or API routes.

Return a short technical decision report and wait for my approval.
```

**Completion gate:** The repository has been inspected, the stack and
folder structure have been agreed, and no unapproved changes have been
made.

## Phase 1 --- Backend project foundation

**Goal:** Create a minimal, runnable backend skeleton.

``` text
Execute Phase 1 only: Backend Project Foundation.

Use only the stack and folder structure approved after Phase 0.

Set up the minimum backend application:
- TypeScript configuration.
- Application entry point and server startup.
- Express application setup.
- Environment-variable loading and validation.
- A basic health endpoint: GET /api/v1/health.
- Central error-handling middleware.
- A not-found handler.
- Basic request logging.
- Development, build, start, type-check and test scripts as appropriate.
- A suitable .gitignore.
- A safe .env.example containing placeholder values only.
- A README section explaining setup and how to run the server.

Keep the implementation minimal. Do not create authentication, business tables, project routes or frontend code.

Do not put secrets in source control. Do not silently overwrite existing configuration.

Run the server and verify the health endpoint, build, type-check and tests. Report exact results and stop for approval.
```

**Completion gate:** The backend starts locally, the health endpoint
responds correctly, and the agreed checks pass.

## Phase 2 --- Database connection and migration foundation

**Goal:** Connect PostgreSQL safely and establish migrations.

``` text
Execute Phase 2 only: Database Foundation.

Read the approved project guide and inspect the current code before editing.

Set up the approved PostgreSQL connection and Prisma configuration. Add environment-variable validation for the database connection string. Establish the initial migration workflow.

For this phase:
- Connect the backend to the local development database.
- Add a small database connection check that can be used by the health system.
- Add a documented command for generating and applying development migrations.
- Add a documented command for Prisma client generation.
- Ensure database errors do not expose credentials or internal connection details to API clients.

Do not create all product tables yet. Do not add authentication or project CRUD.

Do not reset, drop or wipe a database. If a migration or database state is unclear, stop and ask me.

Test the connection and migration workflow, report the exact commands and results, and stop for approval.
```

**Completion gate:** The backend connects to PostgreSQL and migrations
can be applied safely in the development environment.

## Phase 3 --- Core identity and organization data model

**Goal:** Establish the minimum data model for users and companies.

``` text
Execute Phase 3 only: Core Identity and Organization Schema.

Design and implement only the foundational database models needed for:
- User.
- Organization.
- Organization membership.
- Role or role assignment.
- Created/updated timestamps.
- Appropriate primary keys, foreign keys, unique constraints and indexes.

The platform is intended to support multiple real-estate companies. A user may need membership in an organization, and access must be scoped to the relevant organization.

Before creating the schema, explain:
1. The purpose of each model.
2. How users belong to organizations.
3. How roles are assigned.
4. How this supports a user who belongs to more than one organization, if that is permitted by the approved design.
5. Which constraints prevent duplicate memberships or duplicate accounts.

Do not add project, plot, booking, contractor, vendor, employee attendance or inventory models in this phase.

After explaining the proposed schema, wait for my approval. Once approved, implement the schema and migration, generate the client and test the database constraints.
```

**Completion gate:** Approved identity and organization models exist,
with a successful migration and constraint tests.

## Phase 4 --- Authentication

**Goal:** Let users securely register, log in and maintain sessions.

``` text
Execute Phase 4 only: Authentication.

Implement authentication using the approved identity schema.

Start with:
- User registration, subject to the agreed account-creation rules.
- Login.
- Secure password hashing.
- Access-token creation and verification.
- A secure refresh-token/session design, including storage and revocation.
- Logout/session revocation.
- GET /api/v1/auth/me for the authenticated user's basic profile and organization memberships.
- Input validation.
- Consistent authentication error responses.
- Rate limiting for login and other sensitive authentication endpoints.

Security requirements:
- Never store plaintext passwords.
- Never return password hashes or refresh tokens in API responses.
- Never trust role or organization IDs supplied by the client.
- Avoid leaking whether an account exists through unnecessarily detailed login errors.
- Do not log passwords, tokens or secrets.
- Define token expiry and refresh behavior clearly.
- Use secure cookie settings if the approved client architecture uses cookies; explain the CSRF implications. Do not choose cookie versus bearer-token handling silently.

Do not implement projects, plots or business modules.

Add unit and integration tests for successful login, invalid credentials, expired/invalid tokens, logout/revocation and protected routes. Report the actual test results and stop.
```

**Completion gate:** Authentication works and protected endpoints reject
unauthenticated requests.

## Phase 5 --- Authorization and organization isolation

**Goal:** Ensure users can only access permitted data.

``` text
Execute Phase 5 only: Authorization and Tenant Isolation.

Implement reusable authorization mechanisms for:
- Authenticated user.
- Active organization membership.
- Organization-scoped access.
- Role-based permissions.
- Platform-admin-only actions, where appropriate.

Use the roles defined in the project brief:
Platform Admin, Seller/Developer, Buyer, Contractor, Vendor and Employee.

Do not assume that every role can access every project. A user's organization membership and project assignment must determine access according to the approved rules.

Create a small permission matrix and show it to me before implementation. Explain how the backend will prevent a user from changing an organization ID in a request to access another company's data.

After approval, implement reusable middleware/helpers and tests that attempt cross-organization access.

Do not implement project CRUD or any later business module in this phase.

Stop after reporting the permission matrix, implementation and test results.
```

**Completion gate:** Tests demonstrate that users cannot access another
organization's protected resources by changing IDs or request
parameters.

## Phase 6 --- Project Management

**Goal:** Build the central project module.

``` text
Execute Phase 6 only: Project Management.

The project is the central entity connecting the real-estate and construction workflows.

Design and implement the Project model and project APIs for the approved requirements:
- Create a project.
- List projects visible to the authenticated user.
- Get one project by ID.
- Update permitted project details.
- Archive or deactivate a project if approved.

First propose the Project fields, statuses, validation rules and API request/response examples. Include organization ownership and audit timestamps.

Rules:
- Every project must belong to an organization.
- Only authorized members of that organization may manage it.
- Do not expose another organization's project through list, detail, update or delete operations.
- Do not allow clients to set protected ownership fields arbitrarily.
- Prefer archival/deactivation over destructive deletion where project records may be referenced later.

Wait for approval of the model and API contract before implementation.

After approval, implement migrations, service logic, routes, validation and tests. Do not implement plots, bookings, construction tasks or vendor operations yet.
```

**Completion gate:** Authorized organization members can manage their
projects; cross-organization access tests pass.

## Phase 7 --- Project membership and external parties

**Goal:** Connect people and companies to projects.

``` text
Execute Phase 7 only: Project Membership and Project Assignments.

Design how a project is connected to:
- Internal seller/developer users.
- Buyer users.
- Contractor organizations.
- Vendor organizations.
- Employee users, through their employer/contractor and project assignment as appropriate.

Do not assume that adding a person to an organization automatically gives them access to every project.

Propose:
- Project membership/assignment models.
- Assignment roles and statuses.
- Who can invite, assign, accept or revoke an assignment.
- How a contractor or vendor can be linked to multiple projects.
- How an employee receives access only to assigned work/projects.

Show the relationship design and permission rules before implementation. Wait for approval.

Implement only the approved membership/assignment capability and tests. Do not implement the full contractor, vendor or employee dashboards.
```

**Completion gate:** Project-level access is explicit and tested.

## Phase 8 --- Plot and property inventory

**Goal:** Allow the seller to manage plots within a project.

``` text
Execute Phase 8 only: Plot Management.

Design and implement plots that belong to a project.

Propose fields such as:
- Plot identifier/number, unique within its project.
- Plot size and unit.
- Facing.
- Location or layout reference.
- Base/current price, using an appropriate money representation.
- Availability status.
- Relevant metadata and timestamps.

Propose explicit plot statuses. At minimum consider:
Available, Temporarily Reserved, Booking Pending, Booked and Sold.

Rules:
- A plot belongs to exactly one project.
- Plot identifiers must be unique within a project.
- Only authorized project members can manage plot data.
- Buyers may only see plot information made available to them.
- Do not let a normal buyer directly change plot price or availability.
- Do not implement a map editor or file uploads unless separately approved.

Show the model and API contract first. Wait for approval, then implement CRUD/list/detail APIs, validation, migrations and tests.
```

**Completion gate:** Plot inventory works and organization/project
isolation is preserved.

## Phase 9 --- Buyer enquiries and booking lifecycle

**Goal:** Implement a safe booking process.

``` text
Execute Phase 9 only: Buyer Enquiry and Plot Booking.

Before coding, propose the booking state machine and explain every transition. The intended broad flow is:
Buyer selects a plot → submits booking request → seller reviews/approves or rejects → payment is recorded/verified → booking is confirmed according to the approved business rule.

Consider:
- Booking request.
- Seller approval/rejection.
- Temporary reservation and expiry, if approved.
- Payment records and payment status.
- Cancellation.
- Booking confirmation.
- Audit history.

Critical concurrency requirement:
Two buyers must never successfully reserve/book the same plot at the same time. Design this using database transactions and appropriate database constraints/locking. Do not rely only on frontend checks.

Do not integrate a real payment gateway. For now, model payment records and a safe mechanism for recording/verifying payment status according to the agreed manual or test process. Never treat a client-provided `payment_success: true` as proof of payment.

Show the state machine, concurrency strategy, models and API examples. Wait for approval before implementation. Add tests for simultaneous booking attempts and invalid state transitions.
```

**Completion gate:** The booking lifecycle is explicit, auditable and
protected against double booking.

## Phase 10 --- Contractor work packages and construction progress

**Goal:** Connect project construction work to contractors.

``` text
Execute Phase 10 only: Contractor Work and Construction Progress.

Design and implement:
- Work packages or work categories.
- Contractor assignment to a project/work package.
- Task assignment where approved.
- Work status and deadlines.
- Contractor daily progress updates.
- Progress evidence such as descriptions and photo metadata, without implementing a production file-storage provider yet.
- Seller review/approval of progress updates.
- Project progress summaries derived from approved work data where practical.

Possible work categories include civil, electrical and plumbing, but keep categories configurable if that is appropriate.

Rules:
- Contractors can only access projects and work packages assigned to them.
- Contractor users cannot approve their own submitted progress if seller approval is required.
- Record who submitted and reviewed each update.
- Do not accept arbitrary progress percentages without validation and an agreed calculation rule.

Present the proposed workflow and calculation method first. Wait for approval, then implement only this phase and its tests.
```

**Completion gate:** Contractor work and progress updates are scoped,
reviewable and auditable.

## Phase 11 --- Buyer modification requests

**Goal:** Track buyer-requested property changes.

``` text
Execute Phase 11 only: Buyer Modification Requests.

Implement a modification request lifecycle connected to a buyer's booking/property and the relevant project.

Propose statuses such as:
Submitted, Under Review, Approved, Rejected, Assigned, In Progress, Completed and Cancelled.

Capture:
- Request description.
- Property/plot reference.
- Submitted by.
- Review decision and reviewer.
- Assigned contractor, if approved.
- Estimated cost, if applicable.
- Deadline, if applicable.
- Completion evidence and timestamps.

Rules:
- A buyer can only request changes for a property they are authorized to access.
- A buyer cannot approve their own request.
- Only authorized seller users can approve/reject.
- Contractor access begins only after a valid assignment.
- Preserve status history.

Show the state machine and permission matrix before implementation. Wait for approval, then implement tests for invalid transitions and unauthorized access.
```

**Completion gate:** Modification requests have a complete, auditable
lifecycle.

## Phase 12 --- Vendor orders and material inventory

**Goal:** Implement the material supply and stock workflow.

``` text
Execute Phase 12 only: Vendor Orders and Inventory.

Design the material lifecycle:
Contractor raises material request → authorized seller/store user reviews → purchase/order is created → vendor receives order → vendor records delivery → store inspects and accepts/rejects quantity → accepted stock is recorded → material is issued to a work site/contractor → consumption and wastage are recorded.

Keep these as distinct records/events:
- Material request.
- Purchase order.
- Delivery.
- Receipt/inspection.
- Stock transaction.
- Material issue.
- Consumption.
- Wastage/adjustment.

Do not implement stock as one manually editable number. Maintain a transaction ledger so stock can be reconstructed and audited.

Propose inventory units, decimal precision, stock calculation, partial delivery handling, rejected/damaged materials, duplicate invoice/delivery protection and authorization rules.

Wait for approval of the data model and workflow before implementation. Do not integrate supplier payment or accounting systems.
```

**Completion gate:** Stock balances are derived from auditable
transactions and tested for partial deliveries and adjustments.

## Phase 13 --- Employee assignments and attendance

**Goal:** Implement employee work assignment and attendance.

``` text
Execute Phase 13 only: Employee Assignments and Attendance.

Implement the approved employee workflow:
Employee signs in → views assigned project/work → checks in → records attendance → submits work update if assigned → checks out → views attendance/history.

Before coding, clarify and document:
- Who creates employee accounts.
- How employees are linked to an employer/contractor organization.
- Who assigns an employee to a project and task.
- Whether site check-in requires GPS, a photo or both.
- How GPS/network failures and manual corrections are handled.
- Who approves attendance corrections.

Do not assume GPS coordinates or a photo prove physical presence. Treat location/photo as evidence subject to privacy, consent and verification rules.

Wait for approval of these rules. Then implement the basic attendance records and authorization tests. Do not add biometric verification or background tracking.
```

**Completion gate:** Employees can only access their own permitted
attendance and assignments; supervisors have approved oversight.

## Phase 14 --- Documents, notifications and audit history

**Goal:** Add supporting platform capabilities after core workflows
exist.

``` text
Execute Phase 14 only: Supporting Platform Capabilities.

Propose a design for:
- Project/property/booking/contractor/vendor document metadata and access permissions.
- File storage abstraction, with local development storage only if approved.
- In-app notifications for relevant events.
- Audit history for important changes and approvals.

Do not connect an external cloud storage, email, SMS or push notification provider without approval.

Security requirements:
- Check authorization before allowing file metadata access or download.
- Validate file type and size when upload support is introduced.
- Never expose private document links publicly by default.
- Do not store file bytes directly in database records unless there is an explicit reason.
- Do not put sensitive information into notification messages or logs unnecessarily.

Show the proposed design first. Wait for approval, then implement one capability at a time with tests.
```

**Completion gate:** Supporting capabilities respect project and
organization permissions.

## Phase 15 --- API documentation, integration readiness and hardening

**Goal:** Make the backend ready for frontend integration and controlled
deployment.

``` text
Execute Phase 15 only: API Documentation and Backend Hardening.

Review the implemented backend without rewriting it unnecessarily.

Tasks:
- Produce/update OpenAPI documentation for implemented endpoints only.
- Standardize success and error response formats.
- Review input validation and authorization on every implemented route.
- Review organization and project data isolation.
- Review database indexes and query patterns.
- Add or improve integration tests for the important end-to-end workflows already implemented.
- Review logging for secret or personal-data leakage.
- Review CORS, security headers, rate limits and environment configuration.
- Document local setup, migrations, test commands and API usage.
- Document known limitations and features not yet implemented.

Do not claim production readiness without a threat review, deployment configuration, backups, monitoring and operational review. Do not deploy or run destructive commands.

Report findings by severity and propose fixes. Ask for approval before making broad refactors.
```

------------------------------------------------------------------------

# 6. Standard prompt to use after every phase

After the agent finishes a phase, use this prompt before approving the
next one:

``` text
Review the work completed in the current phase against BACKEND_BUILD_GUIDE.md.

Do not start the next phase.

Please:
1. Explain the code and important design decisions in beginner-friendly language.
2. List every file created or modified.
3. Show the API endpoints, database models or configuration added in this phase.
4. Show the tests and commands you actually ran, with their results.
5. Identify missing tests, security concerns, assumptions and known limitations.
6. Check that no future-phase functionality was added prematurely.
7. Check that no secrets or generated database files were accidentally added to Git.
8. Give me a short manual verification procedure.

If you find a problem, fix only problems belonging to the current phase, rerun the relevant checks and report the result. Then stop and wait for my approval.
```

------------------------------------------------------------------------

# 7. Git collaboration workflow

Use GitHub for source control. Each developer should work on a separate
feature branch and use Pull Requests to merge changes.

Example:

``` bash
# Get the latest main branch
git checkout main
git pull origin main

# Create a branch for one task
git checkout -b feature/project-management

# Check changed files
git status

# Stage and commit
git add .
git commit -m "Add project management foundation"

# Push your branch
git push -u origin feature/project-management
```

Then open a Pull Request on GitHub. Your teammate should review the
changes and checks before merging.

Do not have both developers edit the same files at the same time if you
can divide the work cleanly. Agree on API contracts and database changes
before building dependent frontend modules.

------------------------------------------------------------------------

# 8. Suggested initial project structure

This is a target structure, not an instruction to create every folder
immediately. Create folders only when a phase needs them.

``` text
real-estate-platform/
│
├── BACKEND_BUILD_GUIDE.md
├── README.md
├── .gitignore
├── .env.example
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   │
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   │
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── common/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── organizations/
│   │   │   ├── projects/
│   │   │   ├── plots/
│   │   │   ├── bookings/
│   │   │   ├── contractors/
│   │   │   ├── vendors/
│   │   │   ├── construction/
│   │   │   ├── inventory/
│   │   │   ├── employees/
│   │   │   └── documents/
│   │   │
│   │   └── tests/
│   │
│   └── package.json
│
└── docs/
    ├── architecture/
    └── api/
```

------------------------------------------------------------------------

# 9. What not to build yet

Do not ask the agent to build all of these at the beginning:

-   Every role's dashboard.
-   Every API endpoint.
-   All database tables in one migration.
-   Real payment gateway integration.
-   Live GPS tracking.
-   Production file uploads.
-   Email/SMS integrations.
-   Analytics and advanced reporting.
-   Microservices.
-   Production deployment and cloud infrastructure.

Build the foundation first, then add one business capability at a time.

------------------------------------------------------------------------

# 10. First milestone

The first meaningful milestone is deliberately small:

1.  The backend project runs locally.
2.  PostgreSQL is connected.
3.  Users and organizations can be represented in the database.
4.  Authentication works.
5.  Organization-level authorization is tested.
6.  A seller can create and manage a project through the API.

Only after this milestone should the team start integrating the Buyer
and Contractor interfaces.

**Start with the Session Start Prompt. Complete Phase 0, review its
recommendations, and approve the next phase explicitly.**
