import { useState } from 'react';
import { getThemePreference, setThemePreference } from '../lib/theme.js';

// LEARN (sprint 14): a 3-way theme control (Light / Dark / System). It's a real
// <select> with a label, not a clever icon-only toggle — a screen reader
// announces "Theme, Light" and a keyboard user operates it with no special code,
// because we used the platform control instead of reinventing one.
export function ThemeToggle() {
  const [pref, setPref] = useState(getThemePreference());
  return (
    <label className="theme-toggle">
      <span className="sr-only">Theme</span>
      <select
        value={pref}
        onChange={(e) => {
          setPref(e.target.value);
          setThemePreference(e.target.value);
        }}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </label>
  );
}
