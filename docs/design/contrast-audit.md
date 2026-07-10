# Color contrast audit — WCAG 2.1 AA

AA requires **4.5:1** for normal text, **3:1** for large text and UI components.
Each row is a token _pairing_ (foreground on background) with its measured ratio.

## Light theme

| Foreground token       | Background token  | Ratio  | AA (4.5:1) |
| ---------------------- | ----------------- | ------ | ---------- |
| `--color-text`         | `--color-bg`      | 13.2:1 | ✅         |
| `--color-text`         | `--color-surface` | 12.1:1 | ✅         |
| `--color-text-muted`   | `--color-bg`      | 4.6:1  | ✅         |
| `--color-primary-text` | `--color-primary` | 8.2:1  | ✅         |
| `--color-danger`       | `--color-bg`      | 6.4:1  | ✅         |

All light-theme pairings pass.

## Dark theme

The review caught the trap here: **contrast is a property of a PAIRING (two
resolved colors), not of a token name.** The dark theme reuses the token _names_
but with different _values_, so it needs its own audit — and it had a failure.

| Foreground token                     | Background token  | Ratio     | AA (4.5:1)        |
| ------------------------------------ | ----------------- | --------- | ----------------- |
| `--color-text`                       | `--color-bg`      | 14.8:1    | ✅                |
| `--color-text`                       | `--color-surface` | 12.9:1    | ✅                |
| `--color-text-muted` (was `#7d8590`) | `--color-surface` | **3.9:1** | ❌ **before fix** |
| `--color-text-muted` (now `#96a0af`) | `--color-surface` | 5.3:1     | ✅ **after fix**  |
| `--color-primary-text`               | `--color-primary` | 6.1:1     | ✅                |

`--color-text-muted` passed on the light background (4.6:1 on white) but its dark
value failed on the raised `--color-surface` (3.9:1). Bumped the dark value until
the pairing clears AA.

## The lesson

**Audit every theme, every pairing.** A token that passes in one theme tells you
nothing about the other — the numbers are per resolved-color-pair. "Same token
names" is not "same contrast".

_Ratios computed with the WCAG relative-luminance formula._
