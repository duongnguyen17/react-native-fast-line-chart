import type { processColor } from 'react-native';
import type {
  ExtraOffsets,
  LineChartConfig,
  LineChartDataSet,
  LineDataSetConfig,
  LineXAxisConfig,
  LineYAxisConfig,
} from '../../src';

type WrapperColor = ReturnType<typeof processColor>;
type DataSetColorKey =
  'color' | 'circleColor' | 'circleHoleColor' | 'valueTextColor' | 'fillColor';
type AxisColorKey = 'axisLineColor' | 'gridColor' | 'textColor';
type WithWrapperColors<T, K extends keyof T> = Omit<T, K> &
  Partial<Record<K, WrapperColor>>;

type WrapperDataSet = Omit<LineChartDataSet, 'config'> & {
  config?: WithWrapperColors<LineDataSetConfig, DataSetColorKey>;
};

export interface WrapperPriceChart {
  data: { dataSets: WrapperDataSet[] };
  xAxis: WithWrapperColors<LineXAxisConfig, AxisColorKey>;
  yAxis: { left: WithWrapperColors<LineYAxisConfig, AxisColorKey> };
  extraOffsets?: ExtraOffsets;
  animation?: { durationX?: number };
  maxVisibleValueCount?: number;
}

function toHex(color: WrapperColor | undefined): string | undefined {
  if (typeof color !== 'number') return undefined;
  // React Native may return signed Android ARGB values; preserve their bits.
  // eslint-disable-next-line no-bitwise
  return `#${(color >>> 0).toString(16).padStart(8, '0')}`;
}

function adaptAxis<
  T extends {
    axisLineColor?: WrapperColor;
    gridColor?: WrapperColor;
    textColor?: WrapperColor;
  },
>({ axisLineColor, gridColor, textColor, ...axis }: T) {
  return {
    ...axis,
    axisLineColor: toHex(axisLineColor),
    gridColor: toHex(gridColor),
    textColor: toHex(textColor),
  };
}

export function adaptPriceChart(chart: WrapperPriceChart): {
  config: LineChartConfig;
  dataSets: LineChartDataSet[];
} {
  const dataSets = chart.data.dataSets.map((set) => {
    if (!set.config) return { values: set.values, label: set.label };
    const {
      color,
      circleColor,
      circleHoleColor,
      valueTextColor,
      fillColor,
      ...config
    } = set.config;
    return {
      ...set,
      config: {
        ...config,
        color: toHex(color),
        circleColor: toHex(circleColor),
        circleHoleColor: toHex(circleHoleColor),
        valueTextColor: toHex(valueTextColor),
        fillColor: toHex(fillColor),
      },
    };
  });

  const entryCount = dataSets.reduce(
    (total, set) => total + set.values.length,
    0
  );
  return {
    config: {
      xAxis: adaptAxis(chart.xAxis),
      yAxis: adaptAxis(chart.yAxis.left),
      extraOffsets: chart.extraOffsets,
      animationDurationX: chart.animation?.durationX,
      maxVisibleValueCount:
        chart.maxVisibleValueCount ?? Math.max(100, entryCount + 1),
      noDataText: '',
      legendEnabled: false,
      autoScroll: false,
      pinchZoom: true,
      dragEnabled: true,
      scaleXEnabled: true,
      scaleYEnabled: false,
    },
    dataSets,
  };
}
