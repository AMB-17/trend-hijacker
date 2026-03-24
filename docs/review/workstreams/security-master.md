# Workstream - Security Master

## Scope

- Internal cron authentication and authorization
- Secrets and environment hardening
- CORS/rate-limit policy validation
- Proxy trust boundary and header handling
- Sensitive logging and dependency risk checks

## Checklist

- [ ] Validate `apps/api/src/routes/internal.ts` rejects unauthorized requests.
- [ ] Validate cron idempotency behavior for repeated triggers.
- [ ] Verify `apps/api/src/config/env-validator.ts` enforces secret strength and required vars.
- [ ] Confirm `CRON_API_URL` targets backend API, not frontend URL.
- [ ] Review `apps/web/pages/api/proxy/[...path].ts` header sanitization and upstream target safety.
- [ ] Audit logs for accidental token/secret leakage patterns.
- [ ] Run dependency vulnerability checks and capture findings.

## Required Evidence

- Command output for unauthorized cron test
- Screenshot or text proof of secrets validation behavior
- Workflow secret mapping proof for scheduled jobs
- Vulnerability scan results with triage notes
