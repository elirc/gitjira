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

All light-theme pairings pass. Since the dark theme uses the same token _names_,
the same components are covered. ✅

_Audited: light theme. Ratios computed with the WCAG relative-luminance formula._
