# Workstream - Professional Software Engineer

## Scope

- API and service reliability
- Architecture consistency and maintainability
- Database query/index performance fitness
- Error handling and observability quality

## Checklist

- [ ] Validate API contracts and error shapes for key routes.
- [ ] Audit `apps/api/src/services/trend.service.ts` for enum compatibility and regression risks.
- [ ] Review `apps/api/src/services/batch-ingestion.service.ts` retry/failure handling.
- [ ] Check DB index fit against top queries from trends/search paths.
- [ ] Verify graceful shutdown behavior for API and workers.
- [ ] Ensure logging includes enough context without leaking sensitive data.

## Required Evidence

- Route-level reliability findings with reproductions
- Query/index recommendations with rationale
- Observability gaps and proposed instrumentation list
