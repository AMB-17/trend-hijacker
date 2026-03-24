# Review Execution Pack

This folder contains the implementation artifacts for the 1-2 week production-hardening review.

## Scope

- Software engineering quality
- AI engineering quality
- Security posture
- Beta testing quality
- UI/UX and accessibility

## How to Start

1. Run `powershell -ExecutionPolicy Bypass -File .\scripts\review-baseline.ps1` from repository root.
2. Open `docs/review/master-tracker.md` and fill owners/dates.
3. Execute each workstream checklist in `docs/review/workstreams/`.
4. Log findings in the tracker with severity and evidence links.

## Severity Model

- P0: Launch blocker, exploit or severe user-impact risk.
- P1: Must-fix for hardening cycle, high risk under realistic conditions.
- P2: Important but deferrable with explicit risk acceptance.

## Definition of Done

- All P0 findings closed.
- P1 findings either closed or accepted with mitigation owner/date.
- Critical-path regression checks pass.
- Release decision document published.
