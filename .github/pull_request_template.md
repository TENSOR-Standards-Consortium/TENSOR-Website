## Summary
- 

## Security Regression Checklist
- [ ] Release/asset URLs are restricted to trusted `https` hosts.
- [ ] `/api/telemetry` origin, content-type, and payload limits are enforced.
- [ ] CSP remains strict (no `unsafe-inline` additions for scripts/styles).
- [ ] Service worker does not cache `/api/*` responses.
- [ ] Error responses avoid exposing internal exception details.
- [ ] Any changes to worker/CSP/workflows were reviewed by a code owner.
