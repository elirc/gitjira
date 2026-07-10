import { forwardRef } from 'react';

// LEARN (sprint 14): component API conventions the whole package follows.
// - forwardRef: a UI primitive must let callers reach its DOM node (focus it,
//   measure it, attach a ref). A Button you can't ref is a dead end.
// - `variant`/`size` are the styling API — callers pick from a fixed set, they
//   don't pass raw colors. The design system decides what "primary" looks like.
// - `...rest` spreads through, so every native <button> prop (onClick, disabled,
//   aria-*, type) just works. Don't re-implement the platform.
// - className is appended, not replaced, so callers can extend without losing
//   the base styles.
export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', className = '', type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`gj-btn gj-btn--${variant} gj-btn--${size} ${className}`.trim()}
      {...rest}
    />
  );
});
