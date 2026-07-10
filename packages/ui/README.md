# @gitjira/ui — the design system

Reusable, accessible components built on shared **design tokens**. The rule:
components reference tokens, never raw values, so the UI stays consistent and
theming is a token swap.

## Component API conventions

Every component in this package follows the same conventions, so learning one
teaches you all of them:

- **forwardRef.** A primitive (Button, Input) forwards its ref to the underlying
  DOM node. Callers need to focus it, measure it, or scroll to it — a component
  you can't ref is a dead end.
- **`variant` / `size`, not raw styles.** Callers choose from a fixed set of
  looks the design system defines. They don't pass `color="#0052cc"`; the system
  owns what "primary" means.
- **Spread native props.** `{...rest}` passes through, so `onClick`, `disabled`,
  `type`, and every `aria-*` attribute just work. Don't re-implement the platform.
- **Append, don't replace, `className`.** Callers can extend styling without
  losing the base.
- **Accessible by construction.** Modal is a real `role="dialog"` with a label,
  a focus trap, and Escape-to-close — you can't accidentally ship an inaccessible
  dialog by using it.

## Accessibility contract

- Interactive components are keyboard operable and expose the right ARIA role.
- Focus is managed: it moves into a dialog on open and (must) return to the
  trigger on close.
- Color is expressed as token pairings that pass WCAG AA — see the contrast audit.

## Exemplar

`Button.jsx` is annotated line-by-line as the reference implementation of these
conventions. New components should read like it.
