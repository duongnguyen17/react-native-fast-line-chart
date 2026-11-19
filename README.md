# react-native-fast-line-chart

⚡ Ultra-fast real-time streaming LineChart for React Native with zero re-renders

## Installation


```sh
npm install @2security/fast-line-chart react-native-nitro-modules
```

> `react-native-nitro-modules` is required as this library relies on [Nitro Modules](https://nitro.margelo.com/).


## Usage


```tsx
import { FastLineChartView } from '@2security/fast-line-chart';

<FastLineChartView
  style={{ height: 240 }}
  config={{
    xAxis: {
      position: 'BOTTOM',
      valueFormatter: ['Mon', 'Tue', 'Wed'],
      drawGridLines: false,
    },
    yAxis: {
      axisMinimum: 0,
      valueFormatter: '#,##0.0#M',
      drawGridLines: true,
    },
    maxVisibleValueCount: 100,
    noDataText: '',
    animationDurationX: 500,
  }}
  dataSets={[
    {
      values: [{ x: 0, y: 1.2 }, { x: 1, y: 1.2 }, { x: 2, y: 1.6 }],
      config: {
        color: '#32a852',
        drawValues: true,
        valueFormatter: ['1.2M', '1.2M', '1.6M'],
        hideConsecutiveDuplicateValues: true,
      },
    },
  ]}
/>
```

The `xAxis` and `yAxis` settings override the corresponding shared styling settings for each axis. The Y-axis formatter takes a decimal format pattern. X-axis and dataset label arrays are indexed by X. With `hideConsecutiveDuplicateValues`, the first label in each consecutive run stays visible and an empty label starts a new run.

`maxVisibleValueCount` controls the native chart's threshold for drawing value labels. When several datasets share the plot, include their entries in the threshold, even when some datasets have `drawValues: false`. Set `noDataText` to an empty string to hide the default message. `animationDurationX` sets the horizontal animation duration in milliseconds when replacing data.

Use `onSelectPoint` to receive the selected `x` and `y` values and the `pixelX` and `pixelY` coordinates in React Native layout units relative to the chart. The ref exposes `setDataSets` and its alias `setChartDataSets` for replacing multiple datasets.

Streaming append methods operate on a single dataset. After setting multiple
datasets, call `clearData()` or `setDataPoints()` before appending; append calls
are otherwise ignored. Non-finite points are ignored. On Android, the native
chart stores coordinates as 32-bit floats, so use relative indices or offsets
instead of large absolute values such as Unix timestamps in milliseconds.

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
