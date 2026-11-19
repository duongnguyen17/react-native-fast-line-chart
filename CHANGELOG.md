# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-11-19

### Added

- **ColorValue Support**: Added direct support for React Native `ColorValue` (`string | number | ColorValue`, including HEX, RGB, RGBA, and numeric `processColor` values) across `LineChartConfig`, `LineChartDataSet`, `LineDataSetConfig`, `LineXAxisConfig`, and `LineYAxisConfig` with automatic Fabric-compliant color normalization.
- **Imperative Call Queueing**: Implemented early call queueing (`runOrQueue`) so imperative commands (`appendPoint`, `appendPointsBatch`, `setDataPoints`, `setDataSets`, `setChartDataSets`, `clearData`, `setVisibleXRangeMaximum`, `moveViewToX`, `fitScreen`) called before the native view finishes attaching are safely buffered and flushed immediately upon attachment.
- **Autolinking Config**: Added `react-native.config.js` to isolate example autolinking dependencies cleanly.
- **Unit Tests**: Added automated test suite verifying color normalization, early ref call queueing, and dataset proxying.

### Changed

- **iOS**: Upgraded DGCharts usage in `FastLineChart.swift` to modern 5.x APIs (migrated `set.entryCount` to `set.count`, `set.clear()` to `set.removeAll(keepingCapacity: false)`, and resolved unused result warnings).

### Fixed

- **Fabric Crash / Incompatibility**: Fixed potential silent drops or conversion issues when passing numeric/ARGB color values to the native layer.
- **Deprecations**: Removed Swift compiler deprecation warnings on iOS.

## [0.1.0] - 2026-11-19

### Added

- Initial release of `@2security/fast-line-chart`.
- Ultra-fast real-time streaming LineChart for React Native built on Nitro Modules.
- Native performance using MPAndroidChart (Android) and DGCharts (iOS) with zero React re-renders.
- Hardware VSync throttling (CADisplayLink on iOS, Choreographer on Android).
- Imperative API via ref (`appendPoint`, `appendPointsBatch`, `setDataPoints`, `setChartDataSets`, `clearData`, `setVisibleXRangeMaximum`, `moveViewToX`, `fitScreen`).
- Multi-dataset support with customizable line styles, curves, fills, and circle markers.
- High-performance touch selection and tap highlighting (`onSelectPoint`).

---

[Unreleased]: https://github.com/duongnguyen17/react-native-fast-line-chart/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/duongnguyen17/react-native-fast-line-chart/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/duongnguyen17/react-native-fast-line-chart/releases/tag/v0.1.0
