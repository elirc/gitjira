# 0028 — Design tokens as the design/code API

**Status:** accepted · **Sprint:** 14

## Context

Every screen was re-deciding colors and spacing. The same "primary blue" appeared
as three slightly different hexes; padding was whatever felt right that day. New
screens were slow because every value was a fresh decision, and the UI drifted.

## Decision

Express spacing, type, and color as **design tokens** — CSS custom properties in
`packages/ui/src/tokens.css`. Components reference `var(--color-primary)` and
`var(--space-4)`, never a literal. The token file is the single contract between
design and code.

## Consequences

- ✅ Consistency by construction — there is exactly one "primary", one spacing
  scale. You can't accidentally invent a fourth blue.
- ✅ Theming is a token swap: dark mode flipped the values under
  `[data-theme='dark']` and every component followed, with zero component changes.
  That single fact is the strongest argument for tokens.
- ✅ New screens are faster — you compose tokens, you don't pick values.
- ❌ Indirection: reading a component, you see `var(--x)`, not the value. Worth it
  for the consistency; a token reference is self-documenting once you know the scale.
- ❌ Tokens must be disciplined — a token per one-off defeats the purpose. Keep the
  set small and meaningful.
