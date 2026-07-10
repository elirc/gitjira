# 0029 — Accessibility is structural, not a coat of paint

**Status:** accepted · **Sprint:** 14

## Context

Accessibility is often treated as an end-of-project audit — bolt on some ARIA,
fix the contrast, ship. That's how you get a modal that traps focus but strands
the keyboard user on close, or text that passes contrast in one theme and fails
in another. The bugs are structural; a late audit finds a fraction of them.

## Decision

Build accessibility into the components and the tokens, not on top of them:

- **Components are accessible by construction.** Modal IS a `role="dialog"` with a
  label, a focus trap, Escape, and focus-return — you can't use it wrong. The
  accessibility isn't a prop you might forget; it's the component.
- **Focus is managed as a first-class concern**, not an afterthought — moved in on
  open, returned on close (WCAG 2.4.3), always visible (2.4.7).
- **Contrast is audited per theme, per pairing** (1.4.3) — because the number is a
  property of two resolved colors, not a token name (see the contrast audit).
- **Motion respects `prefers-reduced-motion`** at the token/CSS layer, so it
  covers everything at once.

## Consequences

- ✅ The whole surface inherits accessibility from a few primitives — fix the
  Modal once, every dialog is correct.
- ✅ A11y behaviors are TESTABLE (focus lands here, role is that) and gated, so
  they don't regress silently. A follow-up wires axe into the E2E journeys.
- ❌ More upfront work per component. That's the point — it's cheaper than
  retrofitting, and it's the difference between "we added ARIA" and "it works
  with a screen reader".

## The lesson

Both a11y bugs this sprint (focus-return, dark contrast) were caught by testing
the app the way an assistive-tech user experiences it — keyboard-only, contrast
checker — not by reading the code. Test the experience, not the markup.
