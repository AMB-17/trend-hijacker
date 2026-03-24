# Workstream - AI Engineer

## Scope

- Data quality from ingestion to scoring
- Determinism and reproducibility
- Scoring explainability and threshold behavior
- Drift/bias risks and observability gaps

## Checklist

- [ ] Validate `packages/scoring/src/velocity-calculator.ts` edge-case behavior when prior count is zero.
- [ ] Review `packages/scoring/src/opportunity-score.ts` weight and threshold sensitivity.
- [ ] Audit `packages/nlp/src/pain-patterns.ts` for negation/context false positives.
- [ ] Audit `packages/nlp/src/sentiment.ts` limitations and replacement options.
- [ ] Verify keyword matching precision in trend engine layers.
- [ ] Design and run deterministic replay test on fixed sample data.

## Required Evidence

- Reproducibility report (same input vs output stability)
- Sensitivity analysis for score component changes
- False positive and false negative examples with impact notes
