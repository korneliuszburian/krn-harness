# WordPress ACF Theme Fixture

Synthetic downstream fixture for KRN Harness dogfood work.

It looks like a tiny WordPress/ACF theme, but it is intentionally static:

- no WordPress runtime
- no PHP runtime
- no Composer install
- no network

Use `npm test` or `node tests/theme.test.js` for deterministic verification.
