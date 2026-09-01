# Motion

Animation in this app has one job: **make a fast, repetitive data-entry tool
feel responsive and certain.** A supervisor marks attendance for twelve workers
before 8am. Every animation on that path either helps them go faster or gets
deleted.

Motion is not decoration here. It is feedback.

## 1. Library

| Package | Version | Why |
|---|---|---|
| `react-native-reanimated` | 4.5.1 | Worklet-driven, runs on the UI thread. Non-negotiable — JS-thread animation stutters on the mid-range Android phones our users actually own. |
| `react-native-gesture-handler` | 2.32.0 | Native gesture recognition; pairs with Reanimated. |
| `expo-haptics` | 57.0.2 | Haptics are half of what makes a tap feel confirmed. |
| `react-native-svg` | 15.15.4 | Path drawing (the checkmark, the rule sweep). |

**These are Expo SDK 57's versions, and `expo install --check` is the authority
on them — not this table.** An earlier draft named Reanimated 4.6.0 and
gesture-handler 3.2.1, which cannot be installed here: Reanimated 4.6 requires
`react-native-worklets` 0.12.x, and SDK 57's `expo-modules-core` accepts at most
0.10.x. Corrected in Phase 1 when the app was first scaffolded. Re-run
`expo install --check` after any SDK bump rather than trusting this table.

**Not used:** Lottie. A JSON animation player is 500KB+ and invites decorative
animation. If a moment genuinely needs Lottie, write an ADR justifying it first.

**`Animated` from React Native core is banned.** Reanimated only, so everything
runs off the JS thread.

## 2. Timing

| Token | Duration | Curve | Used for |
|---|---|---|---|
| `instant` | 100ms | ease-out | Colour and opacity changes |
| `quick` | 180ms | ease-out | Row states, chips, toggles |
| `standard` | 240ms | ease-out | Sheets, entrances, transitions |
| `deliberate` | 320ms | ease-in-out | Full-screen transitions only |

Springs for anything the finger drove: `{ damping: 18, stiffness: 220, mass: 0.6 }`.

**Nothing on a data-entry path exceeds 240ms.** At 300ms a control feels
sluggish by the tenth repetition, and our users are on the hundredth.

## 3. The four signature moments

Spend the animation budget in a few places and keep everything else still.
Scattered effects are what make an interface feel generated.

### 3.1 The attendance mark — the app's defining interaction

Tapped hundreds of times a day. It must feel like making a mark on paper.

1. The letter (P/A/H/L) cross-fades and scales `0.85 → 1.0`, `quick`
2. The **margin rail colour wipes in horizontally**, left to right, 180ms —
   the ink stroke
3. `Haptics.impactAsync(Light)` fires on touch-down, not on completion
4. The row background flashes the status wash at 40% and settles, `instant`

The wipe direction matters: left-to-right reads as writing. Reversed, it reads
as erasing.

### 3.2 Ruling off — the save confirmation

When a batch saves (a muster day, a payment, an expense):

1. A hairline sweeps left to right beneath the saved group, 240ms
2. A checkmark **draws** along its SVG path, 200ms, `accent`
3. `Haptics.notificationAsync(Success)`

This is the ledger gesture of ruling a line under a finished entry. It is the
one moment in the app allowed to be a little bit satisfying.

### 3.3 The Quick Add sheet

1. Spring up to the medium detent
2. Content **staggers in**: 24ms between items, opacity + 8pt translateY,
   **capped at 5 items** — beyond that it reads as slow, not polished
3. Backdrop fades to 40% over `standard`

### 3.4 Figures that change

Balances, totals and outstanding amounts **count** to their new value over
240ms rather than snapping. Because figures are tabular there is no layout
shift while they roll. Applies to a value that *changed*, never to one
appearing for the first time.

## 4. Everyday motion

| Where | What |
|---|---|
| Row press | Scale to 0.98 + `surface-sunk` background, `instant` |
| Screen push | Platform default. Do not invent a custom transition. |
| Sheet dismiss | Follows the finger, springs to closed |
| Tab switch | Cross-fade `quick`. **No sliding** — it implies spatial order that isn't real |
| List item enter | Fade + 8pt rise, `quick`, staggered 20ms, first 8 items only |
| Pull to refresh | Platform default |
| Sync chip | Slow 2s opacity pulse `0.6 → 1.0` while pending; settles to `success` with a single scale bounce |
| Skeletons | Shimmer sweep, 1.2s, `surface-sunk` → `rule` → `surface-sunk` |
| Error | Horizontal shake, 3 cycles, 8pt, 300ms total + `Haptics.notificationAsync(Error)` |

## 5. Haptics

Deliberate, never continuous.

| Feedback | Trigger |
|---|---|
| `impactAsync(Light)` | Attendance status change, chip select, toggle |
| `impactAsync(Medium)` | Sheet snap, pull-to-refresh release |
| `notificationAsync(Success)` | Save, sync complete, settlement done |
| `notificationAsync(Warning)` | Validation failure |
| `notificationAsync(Error)` | Request rejected, conflict |
| `selectionAsync()` | Scrolling a picker |

**iOS gets the full set. Android gets Light only** — haptic quality varies wildly
across Android hardware and a bad buzz is worse than silence. Respect the system
haptic setting.

## 6. Reduce Motion

`useReducedMotion()` from Reanimated, checked in every animated component.

When it is on: **replace, never remove.** Movement and scale become a 100ms
cross-fade. Haptics stay. The rail still changes colour, the checkmark still
appears — they simply do not travel. A user with Reduce Motion on must still
know their tap registered.

## 7. Never animate

- Anything that blocks input, ever
- List content while scrolling
- More than one thing on screen at once — one animation owns the moment
- A loading spinner where a skeleton belongs
- Anything on the sync path that would misrepresent the true state
- Decoratively, on a screen users see fifty times a day. Novelty becomes
  friction fast.

## 8. Performance budget

- 60fps on a mid-range Android. **Test on real hardware, not a simulator** — the
  simulator will lie to you about exactly this.
- All animation on the UI thread via worklets. If an animation needs the JS
  thread, redesign it.
- No animation during a list scroll or a sync flush.
- Profile the muster roll specifically: 30 rows, all animating status changes,
  must not drop a frame.

## Checklist

- [ ] Reanimated worklets, never core `Animated`
- [ ] Nothing over 240ms on a data-entry path
- [ ] `useReducedMotion()` handled — replaced, not removed
- [ ] Haptic paired with every meaningful state change
- [ ] Verified at 60fps on a real mid-range Android
- [ ] One animation owns the moment
