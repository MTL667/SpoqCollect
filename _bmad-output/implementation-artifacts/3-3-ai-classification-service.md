# Story 3.3: AI Classification Service

Status: ready-for-dev

## Story (As a / I want / so that)

As a system, I want to classify photos via OpenAI Vision API, so that inspectors receive suggestions.

## Acceptance Criteria

1. ScanJob "pending" → worker picks up → sends to OpenAI with dynamic prompt → status "processing"
2. AI returns → typeId+confidence+candidates → ScanJob "completed", ScanRecord updated
3. AI slow → inspector not blocked (already scanning next)
4. API fails → retry 3x, then flag for manual
5. Prompt includes building type context + applicable object types + confidence thresholds

## Tasks / Subtasks

- [ ] Create `server/src/services/ai-classifier.ts` with OpenAI Vision integration
- [ ] Implement dynamic prompt with building type context
- [ ] Include applicable object types from DB filtered by building type
- [ ] Include confidence thresholds in prompt
- [ ] Parse AI response: typeId, confidence, candidates array
- [ ] Create `server/src/services/queue.ts` PostgreSQL polling worker
- [ ] Poll scan_jobs every 2s for status="pending"
- [ ] Process one job at a time, update status through lifecycle
- [ ] Update ScanRecord with aiProposedTypeId, aiConfidence, aiRawResponse
- [ ] Implement retry 3x on API failure
- [ ] Flag for manual after 3 failed attempts
- [ ] Add confidence constants to `client/src/shared/lib/constants.ts`

## Dev Notes

**Previous Story Context:** Story 3.2 provides photo upload and ScanJob creation. ScanRecord and ScanJob models exist.

**Architecture Patterns:**
- AI: OpenAI Vision API, dynamic prompt with object types per building type
- Confidence thresholds: HIGH ≥ 0.85, MEDIUM ≥ 0.50, LOW < 0.50
- Background queue: PostgreSQL scan_jobs table, polling worker in Express process

**AI Prompt Pattern:**
```
You are a fire safety object classifier.
Given a photo, classify as one of these types.
Return JSON: { "typeId": "<id>", "confidence": 0.0-1.0, "candidates": [{"typeId": "<id>", "confidence": 0.0-1.0}] }
Available types: [dynamic from DB filtered by building type]
Building context: <buildingType.nameNl>
```

**Queue Worker Pattern:**
- Polls scan_jobs every 2s for status="pending"
- Processes one at a time
- Updates status through lifecycle: pending → processing → completed (or failed)

**Key Files:**
- `server/src/services/ai-classifier.ts` (OpenAI integration)
- `server/src/services/queue.ts` (PostgreSQL polling worker)
- `client/src/shared/lib/constants.ts` (confidence thresholds)

**Dependencies:** openai (npm package)

**FRs:** FR7. **NFRs:** NFR3 (<3s), NFR8 (API keys server-side).

## Dev Agent Record

- Agent Model Used:
- Debug Log References:
- Completion Notes List:
- File List:
