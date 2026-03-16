# Story 3.1: Camera Capture

Status: ready-for-dev

## Story (As a / I want / so that)

As an inspector, I want to capture a photo using the iPad camera from within the app, so that I can quickly document objects.

## Acceptance Criteria

1. Tap "Scan" → camera opens <1s (NFR1), rear camera default
2. Capture photo → preview shown, ready for next <1s (NFR2)
3. Cancel → return to session detail
4. iPad Safari getUserMedia with fallback if permission denied

## Tasks / Subtasks

- [ ] Create `use-camera.ts` hook wrapping `navigator.mediaDevices.getUserMedia()`
- [ ] Configure video constraints: `facingMode: 'environment'` for rear camera
- [ ] Implement state machine: idle → starting → active → error
- [ ] Implement capture via canvas.toBlob()
- [ ] Create `CameraView.tsx` component with video preview and capture button
- [ ] Create `ScanFlow.tsx` orchestrator integrating camera and session context
- [ ] Add "Scan" entry point from session detail
- [ ] Add "Cancel" to return to session detail
- [ ] Handle permission denied with user-friendly fallback
- [ ] Verify <1s camera open and capture-to-ready performance on iPad Safari

## Dev Notes

**Previous Story Context:** Epic 1+2 complete. Session detail with virtualized scan list exists. TanStack Query, React Router, auth middleware in place.

**Architecture Patterns:**
- Camera: custom hook `use-camera.ts` wrapping `navigator.mediaDevices.getUserMedia()`, facingMode: 'environment', capture via canvas
- Naming: PascalCase components, kebab-case files

**Code Patterns:**
- Hook pattern: `getUserMedia({ video: { facingMode: 'environment' } })`
- Capture: draw video frame to canvas, call `canvas.toBlob()`
- States: idle → starting → active → error

**Anti-patterns:**
- DO NOT upload photo in this story (that's 3.2)
- DO NOT call AI (that's 3.3)

**Key Files:**
- `client/src/features/scan/use-camera.ts` (hook)
- `client/src/features/scan/CameraView.tsx` (component)
- `client/src/features/scan/ScanFlow.tsx` (orchestrator)

**Dependencies:** none new

**FRs:** FR6. **NFRs:** NFR1, NFR2.

## Dev Agent Record

- Agent Model Used:
- Debug Log References:
- Completion Notes List:
- File List:
