# State of GitJira — after Sprint 14 (v0.10.0)

**Tag:** `v0.10.0` / `sprint-14` · **PR:** #131 · **Version:** 0.10.0

## What the system can do

Everything from v0.9.0, now on a **design system** (tokens + reusable accessible
components), with **dark mode** and a **WCAG 2.1 AA** pass. New screens compose
tokens instead of re-deciding colors; the app works with a keyboard and a screen
reader.

## The change

```
   TOKENS (packages/ui/src/tokens.css)  ── the design/code API ──►  components + themes
        │                                                                │
   @gitjira/ui: Button, Modal (role=dialog, focus trap, focus-return, Escape)
        │
   dark mode = flip token values under [data-theme='dark']  (no component changed)
        │
   a11y: visible focus · reduced-motion · sr-only · contrast audited per theme/pairing
```

## Metrics

| Metric                | Value                                       | Prev |
| --------------------- | ------------------------------------------- | ---- |
| Packages              | 4 (shared, test-factories, ui, —)           | 3    |
| Design tokens         | spacing/type/color as CSS vars              | none |
| Themes                | light / dark / system (persisted)           | 1    |
| A11y failures fixed   | focus-return (2.4.3), dark contrast (1.4.3) | —    |
| Initial bundle (gzip) | ~70 kB (still under the 85 budget)          | ~70  |

## Tech-debt register (delta)

| Debt                          | Why                                             | Due       |
| ----------------------------- | ----------------------------------------------- | --------- |
| Storybook not deployed        | Component docs live in the README for now       | later     |
| axe not wired into E2E        | a11y automation belongs in the E2E workflow     | follow-up |
| i18n not started              | Strings still inline; foundation deferred       | later     |
| Only part of the app migrated | TopNav uses @gitjira/ui; full migration ongoing | ongoing   |

## For the junior: what to study here

1. **Tokens as the design/code API** — and why dark mode became a 3-line change (ADR 0028).
2. **Accessible-by-construction components** — Modal you can't use wrong.
3. **Focus management** — the review's focus-return finding (WCAG 2.4.3), fixed with a test.
4. **Contrast is per pairing, per theme** — the dark-muted finding (1.4.3), and the audit table.
5. **Test the experience, not the markup** — both bugs were caught by using the app as an AT user (ADR 0029).
