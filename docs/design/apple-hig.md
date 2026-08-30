# Mobile Design Guide — Apple HIG baseline

Apple's Human Interface Guidelines are our design baseline, **adapted** per
platform rather than cloned onto Android. Where the two platforms genuinely
differ (back navigation, typography, elevation, haptics) we follow each
platform's own convention. Where they don't, we use one design.

The users are workshop owners, supervisors and managers. Many are not
comfortable with dense software. Screens get used **outdoors, in bright sun,
with dusty or wet hands, often one-handed while holding something else.**
Every rule below follows from that.

## 1. Layout & touch

- **Minimum touch target: 44×44pt (iOS) / 48×48dp (Android).** No exceptions.
  Our most-tapped control — the attendance status toggle on the muster roll —
  should be closer to 56pt.
- **Reachability.** Primary actions live in the bottom third of the screen.
  Never put a save button top-right and expect one-handed use.
- **Respect safe areas** on every screen: notch, Dynamic Island, home indicator,
  Android gesture bar. Use `react-native-safe-area-context`, not constants.
- Spacing on an 8pt grid. 16pt default screen margin, 12pt between related
  items, 24pt between groups.
- **Never place a destructive action adjacent to a frequent one.** Delete is
  never next to Save.

## 2. Typography

- iOS: SF Pro (system). Android: Roboto (system). Never bundle a display font
  for body text — system fonts get accessibility features for free.
- **Support Dynamic Type / font scaling.** Layouts must survive the largest
  accessibility text size without clipping. Test at 200%.
- Type scale (iOS names, mapped to Android equivalents):

| Role | Size / Weight | Used for |
|---|---|---|
| Large Title | 34 / Bold | Screen title on scroll-to-top |
| Title 2 | 22 / Semibold | Section headers |
| Headline | 17 / Semibold | List item primary text, worker names |
| Body | 17 / Regular | Default |
| Subheadline | 15 / Regular | Secondary detail |
| Footnote | 13 / Regular | Timestamps, captions |
| Caption | 12 / Regular | Labels, chip text |

- **Amounts use tabular figures** (`font-variant-numeric: tabular-nums`) so
  columns of money line up. This matters on every ledger screen.
- Never set body text below 15pt. Do not use light weights on light grounds.

## 3. Color

- **Semantic tokens, never literals.** `color.text.primary`, `color.status.paid`.
  One token file drives light and dark.
- **Dark mode is required, not a nice-to-have.** Workshops are dim; phones are
  often in dark mode permanently.
- **Contrast: 4.5:1 minimum for text**, 3:1 for UI components. Verify against
  both themes. Sunlight readability is a real constraint here — err brighter.
- **Colour is never the only signal.** An attendance status is a colour *and* a
  letter (P/A/H/L); an order status is a colour *and* a label. Roughly 1 in 12
  men has some colour vision deficiency, and this user base skews male.
- Reserve red strictly for destructive and overdue. Do not use it for "absent" —
  absence is normal, not an error. Use a neutral grey for absent.

## 4. Navigation

- **Tab bar** for top-level destinations, max 5: Home, Orders, **Add**, Labour, More.
- The centre **Add** is the Quick Add action, not a destination — it opens a
  sheet. This is the single most-used control in the app.
- **iOS:** swipe-back from the left edge must always work. Never trap a user in
  a modal without a visible dismiss.
- **Android:** the system back button/gesture must do the sensible thing on
  every screen. Test it — it is the most common Android bug in RN apps.
- **Sheets with detents** for quick entry (medium detent), full screen only when
  the form genuinely needs it. A payment entry should never be a full page push.
- Destructive actions confirm with an action sheet naming the consequence:
  "Delete this payment?" not "Are you sure?".

## 5. Forms & data entry — the core of this product

This app is 80% data entry. It deserves more care than the dashboard.

- **The right keyboard, every time.** `decimal-pad` for money, `number-pad` for
  quantity, `phone-pad` for mobile. A wrong keyboard costs seconds on every entry.
- **Inline validation on blur**, not on every keystroke, and never only on submit.
- **Never lose typed input.** Draft state persists across app background, crash
  and navigation. A form that discards ten fields on a mis-tap will not be used twice.
- **Default aggressively.** Today's date, last-used supplier, the payer who is
  logged in. Every avoided tap is real.
- **Progressive disclosure.** Common fields first; the rest behind "More details".
  A furniture order needs 12 fields but 4 cover most entries.
- Labels above fields, not placeholders-as-labels — placeholders vanish when
  typing and are inaccessible.
- **Show what will be saved before saving** on anything financial.

## 6. The muster roll — designed screen, not a list

The highest-frequency screen in the product. Its specific rules:

- Date at top, immediately changeable, defaulting to today.
- One row per worker: name, photo, and a **large segmented status control**.
- One tap cycles P → A → H → L. No modal, no drill-in, no confirm.
- "Mark all present" as a single action — the common case is everyone present.
- **Saves as one batch**, with an unmistakable saved state.
- **Works fully offline.** Design this path first.
- Target: a 12-worker roll marked in under 15 seconds.

## 7. Feedback & state

- Every screen defines **five** states: loading, empty, error, offline, content.
  An empty list and a failed request must never look identical.
- **Skeletons over spinners** for content that has a known shape.
- **Optimistic UI for writes**, with a clear rollback if the server rejects.
- **Haptics** are meaningful, not decorative: a light impact on status change, a
  success notification on save, an error notification on rejection. iOS only by
  default; Android haptics are inconsistent across devices.
- **Persistent sync chip**: "Synced" / "3 pending" / "1 needs attention".
  Users tolerate delay; they do not tolerate not knowing.
- Toasts confirm; they never carry information the user must act on.

## 8. Accessibility

- Every interactive element has an accessibility label and a role.
- VoiceOver and TalkBack order must follow visual order.
- Respect **Reduce Motion** — no parallax or spring animation when it is on.
- Do not disable font scaling anywhere (`allowFontScaling={false}` is banned).
- Icon-only buttons always carry a label for screen readers.

## 9. Motion

- Purposeful only: it explains where something came from or where it went.
- 200–300ms for transitions; anything slower feels broken on a mid-range Android.
- Use the platform's native navigation transition. Do not invent one.

## 10. Platform divergence — decided once

| Concern | iOS | Android |
|---|---|---|
| Back | Swipe from left edge + nav bar chevron | System back gesture/button |
| Primary action position | Nav bar top-right or bottom sheet CTA | Same, plus FAB where it fits |
| Date/time entry | Native wheel picker in a sheet | Material date/time picker |
| Selection control | Segmented control | Segmented button |
| Confirm destructive | Action sheet from bottom | Alert dialog |
| Typography | SF Pro | Roboto |
| Haptics | Full set | Light only |

## Checklist before any screen is "done"

- [ ] Works one-handed, thumb reaches every primary control
- [ ] All five states implemented
- [ ] Readable at 200% text size
- [ ] Correct in dark mode
- [ ] Contrast verified in both themes
- [ ] Android back does the right thing
- [ ] Writes work with the network off
- [ ] VoiceOver reads it in a sensible order
- [ ] No hardcoded user-facing nouns (terminology map used)
- [ ] Money uses tabular figures and never a float
