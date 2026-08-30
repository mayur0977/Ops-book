# Running DayBook on a real device — without paying anyone

You do not need an Apple or Google developer account to build this app, run it
on a real phone, or pilot it with the furniture business. Defer both until they
buy you something you actually need.

## The short answer

| Want to… | Costs | Needs |
|---|---|---|
| Run on **your Android phone** | **₹0** | Nothing. Sideload an APK. |
| Run on the **iOS Simulator** | **₹0** | A Mac with Xcode (you have one) |
| Run on **your own iPhone** | ₹0 | Free Apple ID + Xcode. Expires every 7 days. |
| Give the app to **other testers** on Android | ₹0 | Send them the APK file |
| **TestFlight** (proper iOS testing) | $99/yr | Apple Developer Program |
| **Play Store** listing | $25 once | Play Console |

**Android is your development and pilot platform.** Build iOS later, once the
app is worth putting in front of people on iPhones.

## Stage 1 — Expo Go (phases 1–2, roughly)

Free, instant, no build step. Install **Expo Go** from the Play Store, run
`pnpm dev`, scan the QR code.

**The catch:** Expo Go ships a fixed set of native modules. Anything outside it
will not run. Included and fine to use early: `expo-router`, `expo-sqlite`,
`expo-camera`, `expo-image-picker`, `expo-secure-store`, `expo-haptics`,
`react-native-reanimated`, `react-native-gesture-handler`, `react-native-svg`.

**Not in Expo Go** — these force the move to Stage 2:
- `react-native-mmkv` → use `expo-secure-store` + AsyncStorage until then
- `@sentry/react-native` → defer to phase 11
- Push notifications need real credentials, so they will not work properly here

Use Expo Go while building auth, tenancy and the configuration engine. It is
the fastest loop you will get.

## Stage 2 — Android development build (phase 3 onward)

The real app, with every native module, on your phone. Still free.

```bash
# One-time
pnpm add -D expo-dev-client
eas login                       # free Expo account, no payment details

# Build an installable APK
eas build --platform android --profile preview
```

EAS emails you a download link. Open it on the phone, allow "install from
unknown sources", done. **No Google Play account is involved** — Android has
always allowed sideloading.

The free EAS tier includes a monthly build quota, which is generous for one
person. Builds queue rather than run in parallel; that is the only real
limitation. (Check current quotas at expo.dev — they change.)

You can also build locally with `eas build --local` for unlimited free builds
if you install Android Studio.

**Share with testers:** send them the `.apk` file. WhatsApp, Drive, anything.
This is how you pilot with the furniture business — no store, no review, no
account.

## Stage 3 — iOS, when you want it

**iOS Simulator (free, today).** Good for checking layout, dark mode and text
scaling. No camera, no push, no real-world feel.

```bash
eas build --platform ios --profile simulator
```

**Your own iPhone with a free Apple ID.** Xcode will sign an app with a
"Personal Team" for a device you own. Limits: **the app stops working after 7
days**, maximum 3 sideloaded apps, and you must re-sign from the Mac each time.
Fine for an occasional check, miserable as a daily workflow.

**$99/yr buys you:** TestFlight (up to 100 internal, 10,000 external testers),
builds that do not expire, push notifications on iOS, and eventually the App
Store. Buy it when you are ready to put the app on someone else's iPhone.

## Push notifications without a Play account

Android push runs on **FCM**, which needs a **Firebase project** — free, and
completely separate from Play Console. Create the project, download
`google-services.json`, and push works in a development build.

iOS push requires an APNs key, which requires the paid Apple account. So the
end-of-day reminders (phase 8) work on Android first and iOS later. That is an
acceptable order — your pilot users are on Android.

## Recommended order

1. **Now:** Expo Go on your Android phone. Free Expo account. Nothing else.
2. **Phase 3:** Switch to Android development builds via EAS.
3. **Phase 8:** Firebase project for FCM push. Still free.
4. **Phase 11 or when piloting on iPhone:** buy the Apple $99.
5. **When you actually want a public listing:** buy the Google $25 and start
   the closed-testing requirement early — it takes a sustained run before
   production access is granted.
