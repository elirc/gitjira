# Concept: migrating a living codebase (the strangler fig)

_A one-page primer, readable without the codebase. Behind the TypeScript adoption in Sprint 10._

You rarely get to rewrite. Real systems are used while you improve them, so the skill that
separates senior from mid is **changing a codebase without stopping it** — no "big-bang
rewrite," which is the single most reliable way to fail.

## The anti-pattern: big-bang

"We'll convert everything to TypeScript in one PR." It sounds decisive. It means: a giant
diff nobody can review, weeks with no shippable state, merge conflicts against every feature
branch, and a coin-flip on whether it ever lands. Big-bang migrations are where good
intentions go to die.

## The pattern: strangler fig

Named after a vine that grows around a tree until it can stand on its own. You wrap the old
thing, migrate piece by piece, and each step is independently shippable:

1. **Make the new and old coexist.** Here: `allowJs` lets TypeScript check `.js` files, so
   typed and untyped code live side by side.
2. **Migrate one unit at a time.** One file opts in (`// @ts-check`), gets JSDoc types, ships.
   The build never breaks; features keep flowing.
3. **Ratchet, don't hope.** A check that the migrated count only goes UP. Without it, the
   migration quietly rots as people add new untyped code. The ratchet makes progress
   monotonic — you can only move forward.

## Two smaller principles

- **Types are design feedback.** Turning the checker on surfaces latent bugs the code was
  carrying (a function called with the wrong argument shape). Each one is a fix + a test —
  the migration pays for itself in caught bugs, not just future safety.
- **`any` is opting back out.** Typing something `any` to make an error disappear defeats the
  purpose — you turned the checker on to catch exactly that. Use a real type, or `unknown`
  and narrow. (Sprint 10's PR review catches a planted `any`.)

## Beyond TypeScript

The strangler fig is the same shape for any migration: a framework upgrade, a database swap,
a service extraction. Coexist → migrate incrementally → ratchet. Learn it once, use it forever.
