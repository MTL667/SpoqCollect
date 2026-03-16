# Story 3.4: Three-Tier Classification UX

Status: ready-for-dev

## Story (As a / I want / so that)

As an inspector, I want AI suggestions presented by confidence level, so that I confirm high-confidence with one tap and choose from options otherwise.

## Acceptance Criteria

1. High confidence ≥0.85 → single suggestion + "Confirm" button + smaller "Change"
2. Medium 0.50-0.84 → selection menu ranked by confidence + "None of these" → full list
3. Low <0.50 → full list filtered by building type, alphabetical, searchable
4. Full list filtered by building type (FR15), Dutch names, alphabetically sorted

## Tasks / Subtasks

- [ ] Create `ClassificationResult.tsx` with 3-tier display logic
- [ ] High tier: single suggestion, prominent "Confirm", smaller "Change"
- [ ] Medium tier: ranked selection menu, "None of these" opens full list
- [ ] Low tier: full list directly, filtered by building type
- [ ] Create `ObjectTypeSelector.tsx` for full list
- [ ] Implement search/filter in ObjectTypeSelector
- [ ] Filter object types by building type
- [ ] Display Dutch names (nameNl)
- [ ] Sort alphabetically
- [ ] Use constants: HIGH_CONFIDENCE_THRESHOLD = 0.85, MEDIUM_CONFIDENCE_THRESHOLD = 0.50

## Dev Notes

**Previous Story Context:** Story 3.3 provides AI classification with typeId, confidence, candidates. ScanRecord has aiProposedTypeId, aiConfidence.

**Architecture Patterns:**
- Confidence thresholds: HIGH ≥ 0.85, MEDIUM ≥ 0.50, LOW < 0.50
- TanStack Query for server state
- Naming: PascalCase components, kebab-case files

**Constants:**
- HIGH_CONFIDENCE_THRESHOLD = 0.85
- MEDIUM_CONFIDENCE_THRESHOLD = 0.50

**Key Files:**
- `client/src/features/scan/ClassificationResult.tsx` (3-tier display)
- `client/src/features/scan/ObjectTypeSelector.tsx` (full list with search/filter)

**Dependencies:** none new. Frontend-only, consuming data from 3.3.

**FRs:** FR8, FR9, FR10, FR15.

## Dev Agent Record

- Agent Model Used:
- Debug Log References:
- Completion Notes List:
- File List:
