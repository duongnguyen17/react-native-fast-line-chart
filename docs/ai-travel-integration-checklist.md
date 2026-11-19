# AI Travel integration checklist

## Implemented

- [x] Independent axis styling, X labels, Y minimum and decimal format.
- [x] Maximum visible label count, empty text and horizontal animation.
- [x] Patch behavior: x-indexed labels with consecutive duplicate suppression and selected point coordinates.
- [x] Android offset units, batched trimming, data index, and reset of axis settings.
- [x] iOS single-point redraw, pending frame cancellation, data index, and axis reset.
- [x] Shared public ref types and a price-chart adapter example.
- [x] Reject non-finite chart points and prevent append from replacing multi-dataset charts.
- [x] Build example native code on iOS and Android; run JavaScript type checking and tests.
- [x] Verify the example's streaming-to-travel transition and full chart viewport on both platforms; verify a point tooltip on iOS using standalone agent-device.
- [x] Check the migration in an isolated copy of the app: TypeScript reports the same 52 pre-existing diagnostics before and after migration.
- [x] Build the isolated AI Travel Android app and verify the chart native library and package registration are present (the build precedes the final Android renderer-cache change).
- [x] Build the isolated AI Travel iOS simulator app with the latest Swift chart and verify the chart framework is embedded. The local prebuilt React Native cache required `REACT_NATIVE_PRODUCTION=1` for this build.

## Remaining acceptance work

- [ ] Verify the final Android renderer-cache change in the isolated app build.
- [ ] Re-run Android device checks on the final renderer-cache change; ADB timed out during installation.
- [ ] Run the isolated AI Travel iOS build with its own Metro server on an appropriate simulator. The built app has no embedded JS bundle; its bundle ID matches an existing app on the first simulator.
- [ ] Verify flight, train, bus and compare screens on iOS and Android, including theme changes, extrema labels, zoom, tooltips, screen rotation, and no-data states.
- [ ] Exercise zero, one, many, and changing points; repeated extrema; multiple lines; and repeated replacement.
- [ ] Measure CPU, memory, update time, frame pacing and memory growth against the wrapper on the same device, data and interactions.
- [ ] Integrate into the real app only after the isolated checks, and update the dependency lockfiles.

Android MPAndroidChart stores coordinates as Float. Large absolute X values such as Unix milliseconds lose precision; use small relative indices for the AI Travel charts. Streaming append calls are ignored while a multi-dataset chart is active; clear it or set single-series data before appending.
