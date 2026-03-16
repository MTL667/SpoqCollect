---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments:
  - '_bmad-output/brainstorming/brainstorming-session-2026-03-12-1300.md'
  - 'Upload all inventaris.xlsx'
  - 'upload heli met handleiding.xlsx'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 0
  excelTemplates: 2
classification:
  projectType: 'Web App (PWA)'
  platform: 'iPad-optimized PWA'
  domain: 'Building Automation / Life Safety Inspections'
  complexity: 'high'
  projectContext: 'greenfield'
  primaryUsers: '~30 internal inspectors'
  coreDependency: 'LLM/AI for object recognition & OCR'
  userCount: 30
workflowType: 'prd'
---

# Product Requirements Document - InventariSpoq

**Author:** Kevin
**Date:** 2026-03-12

## Executive Summary

InventariSpoq is an iPad-optimized Progressive Web App that replaces manual fire safety and inspection inventory workflows with an AI-driven "point and confirm" experience. Targeting ~30 internal inspectors who perform legally mandated safety and inspection audits across client locations, the application uses LLM-powered vision to recognize 39 specific object types (fire extinguishers, emergency lighting, elevators, fire doors, gas detection systems, etc.) across 12 building categories.

The current process — manually filling Excel spreadsheets, classifying objects by memory, and retroactively attaching photos — is slow, error-prone, and requires triple data entry to produce both a Heli OM system upload (29-column Excel) and a client report.

InventariSpoq eliminates this by making the camera the primary data source: one photo triggers object recognition, classification, and evidence capture in a single action. Inspectors shift from "filling in" to "confirming" — the app proposes, the inspector validates. Volume ranges from 20 to 2,000 objects per client visit, with bilingual support (Dutch/French).

### What Makes This Special

No existing tool combines AI-powered object recognition with fire safety and inspection inventory management and automatic dual-export. InventariSpoq is the first purpose-built solution for this niche. The core insight is a fundamental UX inversion: instead of the inspector doing the cognitive work of identifying, classifying, and recording each object, the AI handles recognition and data population while the inspector focuses on validation and exceptions. This reduces per-object handling time from minutes of manual entry to seconds of confirmation, while simultaneously improving data accuracy by eliminating manual classification errors that propagate through the Heli OM upload and client reporting chain.

### Project Classification

| Attribute | Value |
|---|---|
| **Project Type** | Web App (PWA), iPad-optimized |
| **Domain** | Building Automation / Life Safety Inspections |
| **Complexity** | High — 39 object types, legal inspection requirements, dual-output mandate, LLM/AI integration |
| **Project Context** | Greenfield — no existing system to extend |
| **Primary Users** | ~30 internal inspectors |
| **Core Dependency** | LLM/AI vision for object recognition (OpenAI Vision API) |
| **Bilingual** | Dutch and French |
| **Deployment** | Dockerized on Easypanel, company-owned server |

## Success Criteria

### User Success

- **30-40% time reduction** on inventory completion per client visit compared to the current manual Excel workflow
- Inspectors confirm AI-proposed classifications rather than manually identifying and entering object types — the "point and confirm" flow works reliably for common objects
- Zero duplicate data entry: one scan produces data for both Heli OM upload and client report without re-keying
- Significantly less post-visit rework (corrections, photo matching, data cleanup)
- New inspectors reach productive speed faster due to AI-assisted classification reducing required domain memorization

### Business Success

- **Primary: Reduced rework** — fewer post-visit corrections and data quality issues in Heli OM uploads and client reports
- Inventories load cleanly into the existing asset management tool, enabling seamless handoff to ongoing client relationships
- Professional client reports serve as a sales instrument — clients see the quality and decide to engage for asset management and recurring inspections
- Same volume of client locations handled with existing inspector workforce, or increased throughput without proportional staffing

### Technical Success

- AI object recognition achieves sufficient accuracy that inspectors confirm rather than correct in the majority of cases
- PWA performs reliably on iPad with active internet connection
- Heli OM export produces valid 29-column Excel that uploads without manual adjustment
- Client report export produces professional bilingual (NL/FR) output
- System handles sessions from 20 to 2,000 objects without performance degradation

### Measurable Outcomes

| Metric | Target | Measurement |
|---|---|---|
| Time per inventory | 30-40% reduction vs. current process | Compare pre/post for equivalent locations |
| Post-visit rework | Significant reduction | Track correction rate on Heli OM uploads |
| AI recognition accuracy | >80% correct on first suggestion | Confirm vs. correct ratio per session |
| Heli OM export validity | Clean upload without manual fixes | Upload success rate |
| Client conversion | Increased engagement | Clients proceeding to asset management contracts |

## Product Scope & Phased Development

### MVP Strategy

**Approach:** Problem-solving MVP — prove that AI-driven inventory is faster and more accurate than manual Excel on a real client location.

**Builder:** Kevin (solo developer)
**Target:** Working pilot within 1 week
**AI Backend:** OpenAI Vision API (key available)

### Phase 1 — MVP (Week 1 Pilot)

**User Journeys Supported:** Inspector happy path (scan-to-export) + Backoffice (usable export files)

| # | Capability | Description |
|---|---|---|
| 1 | **Session creation** | Start inventory session with client address + building type |
| 2 | **Camera capture** | Take photo via iPad camera in browser |
| 3 | **AI recognition** | Send photo to OpenAI Vision API, receive object type classification from 39 types |
| 4 | **Three-tier confirm** | High confidence → confirm. Multiple candidates → selection menu. Unrecognized → full list |
| 5 | **Session overview** | List of scanned objects in current session with photos |
| 6 | **Heli OM export** | Generate 29-column Excel file matching the Heli OM upload format |
| 7 | **Client report export** | Generate bilingual (NL/FR) report with photos per object |
| 8 | **Basic auth** | Minimal login to identify inspector for audit trail |

**Explicitly Deferred from Phase 1:**
- PWA installation (homescreen icon, fullscreen) — use browser for pilot
- Connectivity loss handling / photo-first fallback
- Audit trail UI (data is captured but no review interface)
- Admin interface for object type management

### Phase 2 — Post-Pilot Hardening

- PWA installable with fullscreen mode, splash screen
- Connectivity loss handling with local persistence and deferred AI processing
- Session persistence across interruptions
- Audit trail UI (immutable scan records with AI proposal vs. inspector decision)
- Performance optimization for large sessions (400+ objects)
- Photo upload optimization (background, compression)

### Phase 3 — Growth

- OCR on type plates (serial numbers, manufacture dates, brand)
- Building type profiles with expected object checklists
- Confidence-based workflow refinement
- Smart Heli field mapping per object type
- Admin interface for object type management (NL/FR, building type matrix)
- Desktop view optimization for backoffice

### Phase 4 — Vision

- Batch-scan with review inbox
- Delta-detection on revisits
- Self-learning recognition model
- Team mode (multi-inspector parallel scanning with session merging)
- Client self-scan light version
- Inspection calendar driven inventory
- Automated quote generation for expired certifications

## User Journeys

### Journey 1: Marc the Inspector — Daily Inventory (Happy Path)

**Who:** Marc, 42, experienced fire safety inspector. 8 years in the field. Knows all 39 object types by heart but types slowly on a tablet. Dreads the Excel post-processing.

**Opening Scene:** Tuesday morning. Marc opens the existing platform on his iPad and sees his assignment: a mid-sized office building at Ringlaan 45 in Gent. Address, contact person, and building type are ready. He drives over.

**Rising Action:** On site, Marc opens InventariSpoq and starts a new inventory session. He enters the address and building type "Kantoor" (or this is passed from the platform). He begins his walkthrough. At the first fire extinguisher, he points his iPad camera — InventariSpoq recognizes it as "Type brandblussers" with high confidence. Marc taps "confirm", the photo is automatically attached. Three seconds, done. On to the emergency lighting, fire detection panel, evacuation plan. Object after object: point, confirm, move on.

**Climax:** Halfway through the building, Marc has scanned 35 objects in 20 minutes — work that would normally take him an hour and a half of noting and photographing. An unfamiliar device in the technical room triggers a low-confidence AI suggestion. Marc corrects it to "Persluchthouders" and continues. His flow is never truly interrupted.

**Resolution:** After 60 objects, Marc is done. He closes the session. InventariSpoq automatically generates the Heli OM Excel export and the bilingual client report. Marc downloads both files and forwards them to backoffice. He's finished by 11 AM — normally this would take until lunch plus an hour of post-processing. He drives to his next location.

**Capabilities Revealed:** Session creation with location data, camera-based AI recognition flow, confirm/correct UX, session completion, dual-export generation, file download.

---

### Journey 2: Marc at a Large Location — Edge Cases (Error Recovery)

**Who:** Same Marc, now at a large shopping mall with 400+ objects.

**Opening Scene:** Marc arrives at a shopping mall with three floors, an underground parking garage, and a technical zone. This will be a long day.

**Rising Action:** Marc starts the session and works systematically floor by floor. In the parking garage he scans rapidly: fire extinguishers, emergency lighting, sprinkler systems, sectional doors. The flow runs well. Then a problem: WiFi drops out in the basement. Marc loses the AI connection.

**Climax:** Without connectivity, the AI cannot recognize objects. Marc must wait for signal or return to a zone with WiFi. He decides to photograph the basement objects first and process the recognition later when connectivity returns. Back on the ground floor, the AI recognition picks up again. An unknown industrial device triggers three AI suggestions — Marc knows the object and selects the correct classification.

**Resolution:** After a full day, Marc has inventoried 420 objects. Without InventariSpoq this would have been two days of work. The export contains all objects, including the basement objects processed later. Backoffice needs minimal corrections.

**Capabilities Revealed:** Large session handling (400+ objects), connectivity loss handling/recovery, manual fallback when AI unavailable, photo-first workflow for later processing, multiple suggestion selection, session persistence across interruptions.

---

### Journey 3: Sarah from Backoffice — Data Processing

**Who:** Sarah, 29, backoffice staff. Currently spends hours daily correcting and reformatting inspection Excel files into the correct Heli OM format.

**Opening Scene:** Sarah arrives at the office in the morning. Three completed inventories from yesterday sit in her queue. Normally she would open each Excel file, correct rows, map columns to the 29-column Heli format, attach photos, and manually format the client report. Two to three hours of work per inventory.

**Rising Action:** With InventariSpoq, Sarah downloads the Heli OM export and client report directly from the completed session. The Heli OM Excel already has the correct 29-column format. The client report is already formatted bilingually with photos per object.

**Climax:** Sarah opens the Heli OM export — all columns are correct, object types properly classified by the AI and confirmed by the inspector. She uploads the file to the platform. It validates without errors. She uploads the client report to the test portal. Done.

**Resolution:** Three inventories processed in 30 minutes instead of an entire workday. Sarah can spend her time on client contact and exceptions rather than data repair. The error rate has dropped from "always corrections needed" to "occasional spot checks."

**Capabilities Revealed:** Export file quality (valid Heli OM format), client report completeness (bilingual, photos included), minimal post-processing needed, download accessibility for backoffice.

---

### Journey 4: Two Inspectors at the Same Location (Post-MVP)

**Who:** Marc and his colleague Pieter at a large healthcare facility with 800+ objects across five wings.

Marc and Pieter each start their own session for the same location. Marc takes wings A-C, Pieter takes wings D-E. They scan in parallel. After completion, both sessions merge into one inventory — one Heli OM export, one client report. No duplicates, no gaps.

**Capabilities Revealed:** *(Post-MVP)* Session merging, multi-inspector support, deduplication, split-location workflows.

---

### Journey Requirements Summary

| Journey | Key Capabilities |
|---|---|
| **Marc — Happy Path** | Session management, AI recognition, confirm/correct UX, dual-export, file download |
| **Marc — Edge Cases** | Connectivity handling, manual fallback, photo-first workflow, large session support, session persistence |
| **Sarah — Backoffice** | Valid Heli OM export format, bilingual client report with photos, download/transfer workflow |
| **Marc & Pieter — Team** | *(Post-MVP)* Session merging, multi-inspector parallel scanning |

## Domain-Specific Requirements

### Data Integrity & Traceability

- **Audit trail per scan:** Every scanned object records: inspector identity, timestamp, AI-proposed classification, inspector action (confirmed/corrected), corrected value (if applicable), and linked photo reference
- **Immutable scan records:** Once a scan is confirmed, the original AI proposal and inspector decision are preserved — no silent overwrites
- **Session integrity:** Complete inventory sessions are traceable end-to-end: who performed it, when, where, how many objects, and what was exported

### Data Model Extensibility

- **Object types are configuration, not code:** The 39 object types must be maintainable as data (add, modify, deactivate) without requiring application changes. Future expansion beyond the current set must be supported
- **Heli OM export format is configurable:** The 29-column mapping must be adjustable when the Heli OM format evolves, without code changes
- **Building types are configurable:** The 12 building types and the object-type-per-building-type applicability matrix must be maintainable as data
- **Bilingual labels are data-driven:** Dutch and French translations for object types, building types, and report content are maintained as configuration

### Integration Constraints

- **InventariSpoq is a data producer, not a platform:** It generates files (Heli OM Excel + client report) consumed by the existing platform. No direct system-to-system integration for MVP
- **File-based handoff:** Backoffice downloads exports and uploads to the existing platform manually. API-based integration is a potential future enhancement
- **Minimal auth:** Authentication identifies who is scanning for audit trail purposes. Inspector accounts are managed in the existing platform

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. AI-Powered Object Recognition in Fire Safety Inspection (New Category)**
No existing tool applies LLM vision technology to fire safety and inspection inventory. InventariSpoq creates a new product category by combining commodity AI vision capabilities with deep domain-specific knowledge (39 object types, 12 building categories, bilingual support, Heli OM format requirements).

**2. UX Inversion: "Fill In" → "Confirm"**
The fundamental interaction model shifts cognitive load from the inspector to the AI. Three-tier confidence model:
- **High confidence:** One-tap confirm
- **Multiple candidates:** Selection menu with top AI suggestions
- **Unrecognized:** Full 39-type manual selection (fallback)

In all tiers, the inspector makes the final decision. The innovation is in reducing the number of options the inspector must consider, not in replacing the inspector's judgment.

**3. Single-Capture Triple-Output**
One photo simultaneously serves as: object recognition input, evidence documentation, and visual reference for the client report. This collapses three separate workflow steps into a single action.

### Market Context

The fire safety inspection market relies on generic inspection tools, custom Excel workflows, or paper-based processes. No competitor combines AI vision with domain-specific object classification and automatic dual-export for this niche. Closest analogies exist in adjacent domains (warehouse inventory, retail shelf scanning) but none target building safety inspections.

### Validation Approach

- **Pilot testing:** Kevin and a small team validate on actual client locations before broader rollout
- **Key metric:** AI recognition accuracy across the 39 object types in real field conditions (varying lighting, angles, obstructions)
- **Success threshold:** Three-tier confidence model must achieve the 30-40% time reduction target

## Web App (PWA) Specific Requirements

### Application Views

| View | Purpose | Primary User |
|---|---|---|
| **Scan Flow** | Camera capture, AI recognition, confirm/correct | Inspector (on-site) |
| **Session Overview** | List of scanned objects, progress, session metadata | Inspector (on-site) |
| **Session List** | Overview of all inventory sessions, status | Inspector + Backoffice |
| **Export/Download** | Generate and download Heli OM Excel + client report | Backoffice |
| **Object Type Config** | Add/modify object types, translations, building type matrix | Admin (post-MVP) |

### Browser Support

| Browser | Priority | Device |
|---|---|---|
| Safari (iPadOS) | Primary | iPad — main field device |
| Chrome (iPadOS) | Supported | iPad — alternative |
| Safari/Chrome (desktop) | Supported | Backoffice — export download, session overview |

### PWA Configuration

- **Installable:** App installable on iPad home screen with custom icon and splash screen (post-MVP)
- **Fullscreen mode:** Runs without browser chrome when launched from home screen (post-MVP)
- **Camera access:** Full access to iPad camera via Web APIs (MediaDevices / getUserMedia)
- **Local persistence:** Session data cached locally to survive brief connectivity interruptions
- **No full offline mode:** AI recognition requires active internet connection. Photo capture works locally with deferred AI processing when connectivity returns

### Technical Architecture

- **SPA framework:** Single Page Application with client-side routing between views
- **State management:** Local session state with server sync — session data must not be lost if the app is backgrounded or briefly loses connectivity
- **File generation:** Server-side generation of Heli OM Excel (29-column .xlsx) and client report (PDF with photos, bilingual)
- **Image handling:** Photos stored server-side, referenced by scan records. Optimized for upload over mobile connections
- **Background queue:** Photo upload and AI classification run asynchronously — never blocking the inspector's scan flow

### Object Type Management

- **MVP:** 39 object types pre-configured. Changes via direct database/config updates by admin (Kevin). No in-app admin interface
- **Post-MVP:** Admin interface for managing object types (name NL/FR, building type applicability matrix, active/inactive status)
- **AI updates:** When new object types are added, AI recognition prompts must be updated to include them

### Not Applicable

SEO, WCAG accessibility, real-time features, push notifications, GPS, accelerometer — not required for this internal tool.

## Functional Requirements

### Inventory Session Management

- **FR1:** Inspector can create a new inventory session by entering a client address and selecting a building type
- **FR2:** Inspector can view a list of all their inventory sessions with status (active/completed)
- **FR3:** Inspector can resume an active inventory session
- **FR4:** Inspector can close/complete an inventory session when all objects are scanned
- **FR5:** Inspector can view all scanned objects within a session as a scrollable list with thumbnails

### Object Scanning & Recognition

- **FR6:** Inspector can capture a photo of an object using the iPad camera from within the application
- **FR7:** System sends the captured photo to an AI vision classification service and receives an object type classification
- **FR8:** System presents a high-confidence result as a single suggestion for one-tap confirmation
- **FR9:** System presents multiple candidate object types as a selection menu when confidence is split
- **FR10:** Inspector can select from the full list of object types when the AI does not recognize the object
- **FR11:** Inspector can confirm or correct the AI-suggested object type before the scan is saved
- **FR12:** System stores each scan record with: photo, confirmed object type, AI-proposed type, inspector identity, and timestamp

### Object Type Data Model

- **FR13:** System maintains a registry of object types with Dutch name, French name, and building type applicability matrix
- **FR14:** Admin can add, modify, or deactivate object types via direct database/configuration (MVP — no UI required)
- **FR15:** System filters the object type selection list based on the session's building type (showing only applicable types)

### Export — Heli OM

- **FR16:** Inspector or backoffice can generate a Heli OM Excel export for a completed session
- **FR17:** System produces a 29-column .xlsx file matching the Heli OM upload format with correct column mapping
- **FR18:** System populates Heli OM fields from scan data: Equipment (ID label), object type category, description, client address fields, and inspection metadata
- **FR19:** System generates ID labels per object following the convention pattern (e.g., "Ringlaan - BB 001")

### Export — Client Report

- **FR20:** Inspector or backoffice can generate a client report for a completed session
- **FR21:** System produces a bilingual (Dutch/French) report containing all scanned objects grouped by location/type
- **FR22:** Client report includes the photo for each scanned object
- **FR23:** Client report includes session metadata: client address, building type, inspection date, inspector name

### Authentication & Identity

- **FR24:** Inspector can log in with credentials to identify themselves
- **FR25:** System associates all scan records with the authenticated inspector for audit trail purposes

### Data Integrity

- **FR26:** System preserves the original AI classification proposal alongside the inspector's final decision for every scan
- **FR27:** System maintains session-level metadata: inspector, location, building type, start/end time, total object count
- **FR28:** System retains all photos linked to their respective scan records

## Non-Functional Requirements

### Performance

| Metric | Target | Rationale |
|---|---|---|
| Camera launch | < 1 second | Inspector flow must feel instant — camera is the primary interaction |
| Photo capture to next scan ready | < 1 second | No delay between scans — photo processing happens in background |
| AI classification result | < 3 seconds | Inspector sees suggestion within seconds of capture |
| Session object list scroll | 60 fps at 2,000 items | Largest expected session size must scroll without frame drops |
| Export generation | < 30 seconds | Heli OM Excel + client report for a full session |

Photo upload and AI classification run in a background queue — they never block the inspector's scan flow. Inspector can continue capturing the next photo immediately after the previous one, regardless of AI processing state.

### Security

- All communication between client and server over HTTPS
- Basic authentication to identify inspectors (no sensitive personal data stored)
- API keys (OpenAI) stored server-side only, never exposed to the client
- Client location data and photos accessible only to authenticated users within the organization

### Reliability & Data Persistence

- **Every scan is persisted locally immediately** — no data loss if connectivity drops or app crashes
- **Background sync queue:** Scans queued locally and synced to server asynchronously. Queue retries on failure without user intervention
- **Session restore:** If connectivity is lost or app is interrupted, inspector resumes with all previously captured scans intact
- **Server-side persistence:** All photos and session data stored on server as source of truth once synced
- **Zero data loss tolerance:** A completed scan must never be lost — local-first, server-confirmed

### Scalability

- ~30 concurrent inspectors, each with active sessions of up to 2,000 objects
- Photo storage scales with usage (~30 inspectors × multiple sessions/day × 20-2,000 photos/session)
- Single Docker instance on Easypanel sufficient for pilot and initial rollout

### Deployment & Infrastructure

- **Containerized:** Docker container(s) on Easypanel
- **Server:** Company-owned server infrastructure
- **Storage:** Photos and session data on server filesystem or attached volume
- **Configuration:** Environment variables for API keys, object type registry, Heli OM column mapping

## Risk Assessment

| Category | Risk | Impact | Mitigation |
|---|---|---|---|
| **AI** | Recognition accuracy insufficient | Wrong data in exports | Three-tier model degrades gracefully — worst case becomes camera-equipped manual selection tool. Prompt engineering improves accuracy |
| **AI** | Similar objects cause persistent confusion | Inspector frustration | Selection menu between candidates — inspector resolves ambiguity |
| **AI** | LLM costs too high at volume | Operational cost | Batch processing, model optimization, or lighter vision models |
| **Connectivity** | WiFi drops during scan | Work interruption, data loss | Local persistence + background sync queue. Photo-first fallback with deferred AI |
| **Data** | Heli OM format changes | Export becomes invalid | Configurable column mapping, not hardcoded |
| **Data** | New object types added | App doesn't recognize them | Extensible object type registry + manual classification fallback |
| **Timeline** | One week too aggressive | Incomplete pilot | Heli OM export prioritized early. Client report can be simpler for pilot |
| **Platform** | iPad camera API issues in browser | Cannot scan | Test camera access on day 1. Fallback: photo upload from camera roll |
| **Adoption** | Inspectors don't find it faster | Low adoption | Pilot with Kevin's team validates immediately. Iterate on feedback |
| **Resources** | Solo developer, tight timeline | Quality compromises | Strict MVP scope. Functional first, polish later. This PRD defines the boundary |
