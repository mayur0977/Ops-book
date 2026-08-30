---
description: Review a screen against the design system, HIG and motion rules
---

Review the screen or component named in `$ARGUMENTS` (or the most recently
changed one) against all three design files:

- `docs/design/design-system.md` — tokens, ruled rows, margin rail, tabular
  figures, uppercase labels, borders-not-shadows
- `docs/design/apple-hig.md` — touch targets, five states, Dynamic Type, dark
  mode, contrast, Android back, one-handed reach, VoiceOver
- `docs/design/motion.md` — Reanimated only, ≤240ms on entry paths,
  `useReducedMotion()`, haptics paired with state changes

Report only **actual violations**, each with the file, the line and the fix.
Ranked most severe first. If it is clean, say so in one line — do not invent
findings to look thorough.

Check these specifically, they are the ones most often missed:
1. A hardcoded colour, radius, font size or duration instead of a token
2. A number rendered without `tabular-nums`
3. A missing empty/offline/error state
4. A hardcoded user-facing noun instead of `useLabel()`
5. Core `Animated` instead of Reanimated
6. `useReducedMotion()` not handled
7. Absent rendered in red rather than grey
