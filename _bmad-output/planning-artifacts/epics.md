---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
completedAt: '2026-03-12'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
---

# InventariSpoq - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for InventariSpoq, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

- FR1: Inspector can create a new inventory session by entering a client address and selecting a building type
- FR2: Inspector can view a list of all their inventory sessions with status (active/completed)
- FR3: Inspector can resume an active inventory session
- FR4: Inspector can close/complete an inventory session when all objects are scanned
- FR5: Inspector can view all scanned objects within a session as a scrollable list with thumbnails
- FR6: Inspector can capture a photo of an object using the iPad camera from within the application
- FR7: System sends the captured photo to an AI vision classification service and receives an object type classification
- FR8: System presents a high-confidence result as a single suggestion for one-tap confirmation
- FR9: System presents multiple candidate object types as a selection menu when confidence is split
- FR10: Inspector can select from the full list of object types when the AI does not recognize the object
- FR11: Inspector can confirm or correct the AI-suggested object type before the scan is saved
- FR12: System stores each scan record with: photo, confirmed object type, AI-proposed type, inspector identity, and timestamp
- FR13: System maintains a registry of object types with Dutch name, French name, and building type applicability matrix
- FR14: Admin can add, modify, or deactivate object types via direct database/configuration (MVP)
- FR15: System filters the object type selection list based on the session's building type
- FR16: Inspector or backoffice can generate a Heli OM Excel export for a completed session
- FR17: System produces a 29-column .xlsx file matching the Heli OM upload format
- FR18: System populates Heli OM fields from scan data
- FR19: System generates ID labels per object following the convention pattern
- FR20: Inspector or backoffice can generate a client report for a completed session
- FR21: System produces a bilingual (Dutch/French) report containing all scanned objects
- FR22: Client report includes the photo for each scanned object
- FR23: Client report includes session metadata: client address, building type, inspection date, inspector name
- FR24: Inspector can log in with credentials to identify themselves
- FR25: System associates all scan records with the authenticated inspector
- FR26: System preserves the original AI classification alongside the inspector's final decision
- FR27: System maintains session-level metadata: inspector, location, building type, start/end time, total count
- FR28: System retains all photos linked to their respective scan records

### NonFunctional Requirements

- NFR1: Camera launch < 1 second
- NFR2: Photo capture to next scan ready < 1 second
- NFR3: AI classification result < 3 seconds
- NFR4: Session object list scroll 60fps at 2,000 items
- NFR5: Export generation < 30 seconds
- NFR6: All communication over HTTPS
- NFR7: Basic authentication to identify inspectors
- NFR8: API keys stored server-side only
- NFR9: Client data accessible only to authenticated users
- NFR10: Every scan persisted locally immediately
- NFR11: Background sync queue with retry on failure
- NFR12: Session restore after connectivity loss
- NFR13: Server-side persistence as source of truth
- NFR14: Zero data loss tolerance
- NFR15: ~30 concurrent inspectors with sessions up to 2,000 objects
- NFR16: Photo storage scales with usage
- NFR17: Docker container(s) on Easypanel
- NFR18: Environment variables for API keys and configuration

### Additional Requirements

- Starter template: `npm create @vite-pwa/pwa@latest inventarispoq -- --template react-ts` + monorepo setup
- Prisma schema with 7 models (Inspector, BuildingType, ObjectType, ObjectTypeBuildingType, InventorySession, ScanRecord, ScanJob)
- Seed data: 39 object types + 12 building types + test inspector
- PostgreSQL job queue (scan_jobs table) with polling worker
- Storage abstraction layer (filesystem now, S3-compatible later)
- OpenAI Vision prompt strategy with confidence thresholds (0.85 high, 0.50 medium)
- @react-pdf/renderer for server-side PDF generation
- @tanstack/react-virtual for virtualized lists
- Multi-stage Dockerfile for single container deployment
- JWT auth flow with Express middleware

### FR Coverage Map

| FR | Epic | Description |
|---|---|---|
| FR1 | Epic 2 | Create inventory session |
| FR2 | Epic 2 | View session list |
| FR3 | Epic 2 | Resume active session |
| FR4 | Epic 2 | Close/complete session |
| FR5 | Epic 2 | View scanned objects list |
| FR6 | Epic 3 | Camera photo capture |
| FR7 | Epic 3 | AI classification |
| FR8 | Epic 3 | High-confidence suggestion |
| FR9 | Epic 3 | Multiple candidates menu |
| FR10 | Epic 3 | Full list fallback |
| FR11 | Epic 3 | Confirm/correct |
| FR12 | Epic 3 | Store scan record |
| FR13 | Epic 1 | Object type registry |
| FR14 | Deferred | Admin config (post-MVP) |
| FR15 | Epic 3 | Filter by building type |
| FR16 | Epic 4 | Generate Heli OM export |
| FR17 | Epic 4 | 29-column .xlsx |
| FR18 | Epic 4 | Populate fields from scan data |
| FR19 | Epic 4 | Generate ID labels |
| FR20 | Epic 5 | Generate client report |
| FR21 | Epic 5 | Bilingual report |
| FR22 | Epic 5 | Photo per object |
| FR23 | Epic 5 | Session metadata |
| FR24 | Epic 1 | Inspector login |
| FR25 | Epic 1 | Associate scans with inspector |
| FR26 | Epic 3 | Preserve AI classification |
| FR27 | Epic 2 | Session-level metadata |
| FR28 | Epic 3 | Retain photos |

**Coverage:** 27/28 FRs covered. FR14 (admin object type config) explicitly deferred to post-MVP.

## Epic List

### Epic 1: Foundation & Authentication
Inspectors can log in and the system is operational with all reference data loaded. Project scaffolding, database schema, seed data (39 object types + 12 building types), Docker deployment, JWT auth flow, health check endpoint.
**FRs covered:** FR13, FR24, FR25

### Epic 2: Inventory Session Management
Inspectors can create, view, resume, and complete inventory sessions. Session detail shows scanned objects.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR27

### Epic 3: Object Scanning & AI Recognition
Inspectors can photograph objects and confirm/correct AI classifications — the core "point and confirm" experience. Camera capture, photo upload, AI classification via background queue, three-tier confidence UX, local persistence.
**FRs covered:** FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR15, FR26, FR28

### Epic 4: Heli OM Excel Export
Backoffice can generate a Heli OM-compliant 29-column Excel export that uploads without manual adjustment.
**FRs covered:** FR16, FR17, FR18, FR19

### Epic 5: Client Report Export
Backoffice can generate a professional bilingual client report with photos per object.
**FRs covered:** FR20, FR21, FR22, FR23

---

## Epic 1: Foundation & Authentication

Inspectors can log in and the system is operational with all reference data loaded. This epic establishes the monorepo project structure, database schema, seed data, authentication flow, and Docker deployment — the technical foundation everything else builds on.

### Story 1.1: Project Scaffolding & Database Setup

As a developer,
I want a fully configured monorepo with database connectivity,
So that all subsequent features have a solid technical foundation to build on.

**Acceptance Criteria:**

**Given** the repository is freshly cloned
**When** I run the install and build commands
**Then** the monorepo compiles successfully with TypeScript strict mode enabled
**And** the directory structure matches: `/client` (Vite React SPA), `/server` (Express API), `/prisma` (schema + migrations), `/shared` (types)

**Given** a PostgreSQL instance is running
**When** I run `npx prisma migrate dev`
**Then** all 7 models are created: Inspector, BuildingType, ObjectType, ObjectTypeBuildingType, InventorySession, ScanRecord, ScanJob
**And** all columns use snake_case mapping via `@map` / `@@map`
**And** all relations and indexes are correctly established

**Given** the server starts
**When** I send `GET /api/health`
**Then** I receive `{ "data": { "status": "ok", "database": "connected" } }` with HTTP 200

### Story 1.2: Seed Data & Object Type Registry

As a developer,
I want the system pre-loaded with all 39 object types, 12 building types, and their applicability matrix,
So that inspectors have a complete registry available from day one.

**Acceptance Criteria:**

**Given** the database is migrated
**When** I run `npx prisma db seed`
**Then** 39 object types are inserted with both Dutch (`name_nl`) and French (`name_fr`) labels
**And** 12 building types are inserted with both Dutch and French labels
**And** the `object_type_building_types` junction table is populated with the correct applicability matrix
**And** one test inspector account is created (email: `test@inventarispoq.be`, known password)

**Given** the seed has run
**When** I query `GET /api/object-types`
**Then** I receive all 39 object types with `id`, `nameNl`, `nameFr`, and `active` status
**And** the response format is `{ "data": [...] }`

**Given** the seed has run
**When** I query `GET /api/building-types`
**Then** I receive all 12 building types with `id`, `nameNl`, and `nameFr`

### Story 1.3: Inspector Authentication

As an inspector,
I want to log in with my credentials,
So that my identity is recorded on all scans I perform.

**Acceptance Criteria:**

**Given** I am on the login page
**When** I submit valid credentials (email + password)
**Then** I receive a JWT token
**And** the token contains `inspectorId` and `email` claims
**And** I am redirected to the sessions overview

**Given** I have a valid JWT token
**When** I make a request to any protected API endpoint
**Then** the request succeeds and the `inspectorId` is available in the request context

**Given** I submit invalid credentials
**When** the server processes the login attempt
**Then** I receive HTTP 401 with `{ "error": { "code": "INVALID_CREDENTIALS", "message": "..." } }`
**And** no token is issued

**Given** I make a request without a token or with an expired token
**When** the server processes the request
**Then** I receive HTTP 401 with `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }`

**Given** I am authenticated
**When** the frontend stores the JWT
**Then** it is stored securely and included in all subsequent API requests via the Authorization header

### Story 1.4: Docker Deployment & Health Check

As a developer,
I want a containerized deployment setup,
So that the application can be deployed to Easypanel with a single Docker image.

**Acceptance Criteria:**

**Given** the project source code
**When** I run `docker compose up`
**Then** a PostgreSQL container and the application container start
**And** the application connects to PostgreSQL
**And** migrations run automatically on startup
**And** the health endpoint responds at `GET /api/health`

**Given** the multi-stage Dockerfile
**When** I build the production image
**Then** it includes: built client static files served by Express, compiled server code, Prisma client, and migration files
**And** the final image does not contain dev dependencies or source TypeScript files

**Given** the application container is running
**When** I check the environment variable configuration
**Then** `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, and `PORT` are configurable via environment variables
**And** no secrets are hardcoded in the image

---

## Epic 2: Inventory Session Management

Inspectors can create, view, resume, and complete inventory sessions. Each session captures a client location inspection with metadata. The session detail view shows all scanned objects in a performant virtualized list.

### Story 2.1: Create Inventory Session

As an inspector,
I want to create a new inventory session by entering a client address and selecting a building type,
So that I can begin scanning objects at a client location.

**Acceptance Criteria:**

**Given** I am authenticated and on the sessions overview
**When** I tap "New Session"
**Then** I see a form with a client address text field and a building type dropdown populated from the database

**Given** I have filled in a valid client address and selected a building type
**When** I submit the form
**Then** a new session is created with status "active", my inspector ID, the current timestamp as start time, and object count 0
**And** I am navigated to the session detail view
**And** the response format is `{ "data": { "id": "...", "status": "active", ... } }`

**Given** I submit the form without a client address or without selecting a building type
**When** the form validates
**Then** I see inline validation errors indicating the missing fields
**And** the session is not created

### Story 2.2: Session List & Resume

As an inspector,
I want to see all my inventory sessions and resume an active one,
So that I can continue work across multiple client visits.

**Acceptance Criteria:**

**Given** I am authenticated
**When** I navigate to the sessions overview
**Then** I see a list of all my sessions showing: client address, building type name (Dutch), status badge (active/completed), start date, and object count
**And** sessions are sorted by most recently updated first

**Given** the session list is displayed
**When** I tap on an active session
**Then** I am navigated to the session detail view where I can continue scanning

**Given** the session list is displayed
**When** I tap on a completed session
**Then** I am navigated to a read-only session detail view

**Given** I have no sessions yet
**When** I view the sessions overview
**Then** I see an empty state with a prompt to create my first session

### Story 2.3: Session Detail & Scanned Objects List

As an inspector,
I want to see all scanned objects within a session as a scrollable list with thumbnails,
So that I can review what has been inventoried and track progress.

**Acceptance Criteria:**

**Given** I am viewing an active session with scanned objects
**When** the object list renders
**Then** I see each scan record showing: thumbnail photo, confirmed object type name (Dutch), timestamp
**And** the list uses `@tanstack/react-virtual` for virtualized rendering

**Given** a session contains 2,000 scanned objects
**When** I scroll through the list
**Then** the scrolling maintains 60fps without jank or lag

**Given** I am viewing session detail
**When** I look at the session header
**Then** I see session metadata: client address, building type, inspector name, start time, and current object count

**Given** a session has no scanned objects yet
**When** I view the session detail
**Then** I see an empty state indicating no objects scanned, with a prompt to start scanning

### Story 2.4: Complete Session

As an inspector,
I want to close an inventory session when I am done,
So that the session is marked as completed and ready for export.

**Acceptance Criteria:**

**Given** I am viewing an active session
**When** I tap "Complete Session"
**Then** I see a confirmation dialog showing the total object count

**Given** I confirm session completion
**When** the server processes the request
**Then** the session status changes to "completed"
**And** the end time is recorded
**And** the final object count is stored in session metadata
**And** I am returned to the sessions overview where the session now shows as completed

**Given** I cancel the confirmation dialog
**When** I return to the session detail
**Then** the session remains active and unchanged

**Given** the session is already completed
**When** I view the session detail
**Then** the "Complete Session" button is not available

---

## Epic 3: Object Scanning & AI Recognition

The core "point and confirm" experience. Inspectors photograph objects, the system classifies them via AI, and the inspector confirms or corrects the result. Photos are uploaded asynchronously via a background queue so the scanning flow is never blocked. Local persistence ensures zero data loss.

### Story 3.1: Camera Capture

As an inspector,
I want to capture a photo of an object using the iPad camera from within the app,
So that I can quickly document and identify objects during an inspection.

**Acceptance Criteria:**

**Given** I am in an active session
**When** I tap the "Scan" button
**Then** the camera viewfinder opens within 1 second (NFR1)
**And** the camera uses the rear-facing camera by default

**Given** the camera is open
**When** I capture a photo
**Then** the photo is taken and a preview is displayed
**And** the camera is ready for the next action within 1 second of capture (NFR2)

**Given** the camera is open
**When** I tap cancel or back
**Then** I return to the session detail without capturing

**Given** I am using iPad Safari
**When** the app requests camera access
**Then** the `getUserMedia` API is used with appropriate constraints for photo quality
**And** a fallback message is shown if camera permission is denied

### Story 3.2: Photo Upload & Background Queue

As an inspector,
I want my photos uploaded in the background without blocking my scanning flow,
So that I can scan objects rapidly without waiting for uploads.

**Acceptance Criteria:**

**Given** I have captured a photo
**When** the photo is submitted
**Then** a ScanRecord is created with status "pending" and the photo is queued for upload
**And** I am immediately returned to the scanning state to capture the next object
**And** the upload happens asynchronously in the background

**Given** a photo is queued for upload
**When** the upload completes successfully
**Then** the photo is stored on the server filesystem at `/data/photos/{sessionId}/{scanRecordId}.jpg`
**And** a ScanJob is created with status "pending" for AI classification
**And** the ScanRecord `photoPath` is updated

**Given** a photo upload fails
**When** the background sync retries
**Then** the upload is retried with exponential backoff
**And** the scan record remains in the local queue until successfully uploaded

**Given** multiple photos are queued
**When** uploads are processing
**Then** they are processed sequentially to avoid overwhelming the connection
**And** the inspector can continue scanning without interruption

### Story 3.3: AI Classification Service

As a system,
I want to classify uploaded photos via the OpenAI Vision API,
So that inspectors receive object type suggestions without manual identification.

**Acceptance Criteria:**

**Given** a ScanJob with status "pending" exists
**When** the background worker picks it up
**Then** it sends the photo to the OpenAI Vision API with a dynamic prompt including the session's building type and the applicable object types
**And** the ScanJob status is updated to "processing"

**Given** the AI returns a classification result
**When** the response is parsed
**Then** the result contains: suggested object type ID, confidence score (0-1), and up to 5 alternative candidates with scores
**And** the ScanJob status is updated to "completed"
**And** the ScanRecord is updated with `aiSuggestedTypeId` and `aiConfidence`

**Given** the AI classification takes longer than expected
**When** 3 seconds have passed (NFR3)
**Then** the system continues to wait but the inspector is not blocked (they are already scanning the next object)

**Given** the OpenAI API call fails
**When** the worker processes the error
**Then** the ScanJob status is set to "failed" with the error message
**And** the job is retried up to 3 times
**And** if all retries fail, the scan record is flagged for manual classification

**Given** the prompt strategy
**When** building the AI request
**Then** the system prompt includes: building type context, list of applicable object type names (NL + FR), expected response format with confidence scores
**And** confidence thresholds are applied: ≥ 0.85 = high confidence, ≥ 0.50 = medium (multiple candidates), < 0.50 = unrecognized

### Story 3.4: Three-Tier Classification UX

As an inspector,
I want to see AI suggestions presented based on confidence level,
So that I can confirm high-confidence results with one tap and choose from options when the AI is less certain.

**Acceptance Criteria:**

**Given** the AI returns a high-confidence result (≥ 0.85)
**When** the classification UI appears
**Then** I see a single suggested object type with its Dutch name and a prominent "Confirm" button
**And** a smaller "Change" option is available to override

**Given** the AI returns multiple candidates (highest confidence ≥ 0.50 but < 0.85)
**When** the classification UI appears
**Then** I see a selection menu with the candidate object types ranked by confidence
**And** I can tap one to select it
**And** a "None of these" option leads to the full list

**Given** the AI does not recognize the object (confidence < 0.50)
**When** the classification UI appears
**Then** I see the full list of object types filtered by the session's building type (FR15)
**And** I can search/scroll to find the correct type

**Given** the full object type list is displayed
**When** I browse the list
**Then** object types are filtered to only those applicable to the current session's building type
**And** the list shows Dutch names and is alphabetically sorted

### Story 3.5: Confirm, Correct & Save Scan Record

As an inspector,
I want to confirm or correct the AI suggestion before the scan is saved,
So that every record has a verified classification and the audit trail is complete.

**Acceptance Criteria:**

**Given** I see an AI suggestion (any tier)
**When** I confirm or select an object type
**Then** the ScanRecord is updated with: `confirmedObjectTypeId`, `inspectorId`, `confirmedAt` timestamp
**And** the original `aiSuggestedTypeId` and `aiConfidence` are preserved unchanged (FR26)
**And** the session's object count is incremented

**Given** I confirm a high-confidence suggestion
**When** the record is saved
**Then** both `confirmedObjectTypeId` and `aiSuggestedTypeId` point to the same object type

**Given** I correct the AI suggestion by selecting a different type
**When** the record is saved
**Then** `confirmedObjectTypeId` differs from `aiSuggestedTypeId`
**And** both values are retained for audit purposes

**Given** a scan record is saved
**When** I check the stored data
**Then** it contains: photo reference, confirmed object type, AI-proposed type, AI confidence, inspector ID, and timestamp (FR12)
**And** the photo remains linked to the scan record (FR28)

### Story 3.6: Local Persistence & Session Restore

As an inspector,
I want my scans preserved locally even if I lose connectivity,
So that I never lose work during a field inspection.

**Acceptance Criteria:**

**Given** I capture and confirm a scan
**When** the scan is processed
**Then** it is immediately persisted to IndexedDB before any server communication (NFR10)

**Given** the device loses connectivity
**When** I continue scanning
**Then** all scans are stored locally in IndexedDB
**And** a sync queue accumulates the pending uploads
**And** I see a visual indicator that I am offline

**Given** connectivity is restored
**When** the sync queue processes
**Then** all pending scans are uploaded to the server in order
**And** failed uploads are retried with backoff (NFR11)
**And** the visual indicator updates to show sync progress

**Given** the app crashes or the browser tab closes during an active session
**When** I reopen the app
**Then** I am prompted to restore my active session (NFR12)
**And** all locally persisted scans are intact
**And** the sync queue resumes uploading any unsynced records

**Given** scans exist both locally and on the server
**When** synchronization completes
**Then** the server is the source of truth (NFR13)
**And** zero scans are lost (NFR14)

---

## Epic 4: Heli OM Excel Export

Backoffice can generate a Heli OM-compliant 29-column Excel export for any completed session. The file uploads to the Heli OM system without manual adjustment.

### Story 4.1: Heli OM Excel Generation

As a backoffice user,
I want to generate a 29-column Heli OM Excel file from a completed session's scan data,
So that I can upload the inventory directly into the Heli OM system without manual data entry.

**Acceptance Criteria:**

**Given** a completed session with scan records
**When** I request a Heli OM export via `POST /api/sessions/{id}/export/heli-om`
**Then** the server generates a .xlsx file using exceljs with exactly 29 columns matching the Heli OM upload format (FR17)
**And** the response returns the file as a download

**Given** the export is generated
**When** I inspect the column mapping
**Then** each row corresponds to one scan record
**And** the object type Dutch name, French name, building type, client address, inspector name, and inspection date are populated from scan and session data (FR18)
**And** columns that have no data source are left empty (not omitted)

**Given** scan records in the session
**When** ID labels are generated
**Then** each object receives a unique ID label following the convention pattern: building type code + sequential number (FR19)
**And** labels are consistent within the session

**Given** a completed session with 2,000 scan records
**When** the export is generated
**Then** it completes within 30 seconds (NFR5)

**Given** an active (non-completed) session
**When** I request a Heli OM export
**Then** I receive HTTP 400 with an error message indicating the session must be completed first

### Story 4.2: Export Download UI

As a backoffice user,
I want to trigger and download the Heli OM export from the session detail page,
So that I can easily access the export without using the API directly.

**Acceptance Criteria:**

**Given** I am viewing a completed session
**When** I see the export options
**Then** a "Download Heli OM Excel" button is visible

**Given** I tap "Download Heli OM Excel"
**When** the export is generating
**Then** I see a loading indicator
**And** the button is disabled to prevent duplicate requests

**Given** the export completes
**When** the file is ready
**Then** the .xlsx file is automatically downloaded to my device
**And** the filename includes the client address and date (e.g., `heli-om-ClientAddress-2026-03-12.xlsx`)

**Given** the export fails
**When** an error occurs
**Then** I see an error message with a retry option

**Given** I am viewing an active session
**When** I look for export options
**Then** the export buttons are not available

---

## Epic 5: Client Report Export

Backoffice can generate a professional bilingual (Dutch/French) client report as PDF for any completed session, including a photo for each scanned object and full session metadata.

### Story 5.1: Client Report PDF Generation

As a backoffice user,
I want to generate a bilingual client report with photos for each scanned object,
So that I can provide clients with a professional inspection document.

**Acceptance Criteria:**

**Given** a completed session with scan records
**When** I request a client report via `POST /api/sessions/{id}/export/client-report`
**Then** the server generates a PDF using @react-pdf/renderer (FR20)
**And** the response returns the file as a download

**Given** the report is generated
**When** I inspect its content
**Then** it contains session metadata: client address, building type, inspection date, and inspector name (FR23)
**And** the metadata section and headings are presented in both Dutch and French (FR21)

**Given** the report is generated
**When** I inspect the object listing
**Then** each scanned object has its own entry with: the captured photo, object type name in Dutch, and object type name in French (FR22)
**And** objects are grouped or ordered logically (by object type or scan order)

**Given** a completed session with 2,000 scan records
**When** the report is generated
**Then** it completes within 30 seconds (NFR5)
**And** photos are resized/compressed as needed to keep the PDF file size manageable

**Given** an active (non-completed) session
**When** I request a client report
**Then** I receive HTTP 400 with an error message indicating the session must be completed first

### Story 5.2: Report Download UI

As a backoffice user,
I want to trigger and download the client report from the session detail page,
So that I can easily generate and share the report with the client.

**Acceptance Criteria:**

**Given** I am viewing a completed session
**When** I see the export options
**Then** a "Download Client Report" button is visible alongside the Heli OM export button

**Given** I tap "Download Client Report"
**When** the report is generating
**Then** I see a loading indicator
**And** the button is disabled to prevent duplicate requests

**Given** the report completes
**When** the file is ready
**Then** the PDF is automatically downloaded to my device
**And** the filename includes the client address and date (e.g., `rapport-ClientAddress-2026-03-12.pdf`)

**Given** the report fails
**When** an error occurs
**Then** I see an error message with a retry option
