import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { processColor, type ColorValue } from 'react-native';
import { getHostComponent, callback } from 'react-native-nitro-modules';
import type {
  FastLineChartProps,
  FastLineChartMethods,
  FastLineChart as HybridFastLineChartViewType,
  Point,
  LineChartDataSet as NativeLineChartDataSet,
  LineDataSetConfig as NativeLineDataSetConfig,
  LineChartConfig as NativeLineChartConfig,
  LineXAxisConfig as NativeLineXAxisConfig,
  LineYAxisConfig as NativeLineYAxisConfig,
} from './FastLineChart.nitro';
import type {
  ChartColor,
  FastLineChartRef,
  FastLineChartViewProps,
  LineChartConfig,
  LineChartDataSet,
  LineDataSetConfig,
} from './FastLineChartView.types';

export type {
  ChartColor,
  FastLineChartRef,
  FastLineChartViewProps,
  LineChartConfig,
  LineChartDataSet,
  LineDataSetConfig,
} from './FastLineChartView.types';

export function normalizeColor(color?: ChartColor | null): string | undefined {
  if (color == null) return undefined;
  if (typeof color === 'string') {
    if (color.startsWith('#')) return color;
    const processed = processColor(color as ColorValue);
    if (typeof processed === 'number') {
      return `#${(processed >>> 0).toString(16).padStart(8, '0')}`;
    }
    return color;
  }
  if (typeof color === 'number') {
    return `#${(color >>> 0).toString(16).padStart(8, '0')}`;
  }
  const processed = processColor(color as ColorValue);
  if (typeof processed === 'number') {
    return `#${(processed >>> 0).toString(16).padStart(8, '0')}`;
  }
  return undefined;
}

export function normalizeDataSetConfig(
  cfg?: LineDataSetConfig
): NativeLineDataSetConfig | undefined {
  if (!cfg) return undefined;
  return {
    ...cfg,
    color: normalizeColor(cfg.color),
    circleColor: normalizeColor(cfg.circleColor),
    circleHoleColor: normalizeColor(cfg.circleHoleColor),
    valueTextColor: normalizeColor(cfg.valueTextColor),
    fillColor: normalizeColor(cfg.fillColor),
  };
}

export function normalizeDataSet(ds: LineChartDataSet): NativeLineChartDataSet {
  return {
    ...ds,
    config: normalizeDataSetConfig(ds.config),
  };
}

export function normalizeConfig(
  cfg?: LineChartConfig
): NativeLineChartConfig | undefined {
  if (!cfg) return undefined;
  const xAxis: NativeLineXAxisConfig | undefined = cfg.xAxis
    ? {
        ...cfg.xAxis,
        axisLineColor: normalizeColor(cfg.xAxis.axisLineColor),
        gridColor: normalizeColor(cfg.xAxis.gridColor),
        textColor: normalizeColor(cfg.xAxis.textColor),
      }
    : undefined;
  const yAxis: NativeLineYAxisConfig | undefined = cfg.yAxis
    ? {
        ...cfg.yAxis,
        axisLineColor: normalizeColor(cfg.yAxis.axisLineColor),
        gridColor: normalizeColor(cfg.yAxis.gridColor),
        textColor: normalizeColor(cfg.yAxis.textColor),
      }
    : undefined;
  return {
    ...cfg,
    backgroundColor: normalizeColor(cfg.backgroundColor),
    gridColor: normalizeColor(cfg.gridColor),
    textColor: normalizeColor(cfg.textColor),
    lineColor: normalizeColor(cfg.lineColor),
    circleColor: normalizeColor(cfg.circleColor),
    circleHoleColor: normalizeColor(cfg.circleHoleColor),
    valueTextColor: normalizeColor(cfg.valueTextColor),
    fillColor: normalizeColor(cfg.fillColor),
    xAxis,
    yAxis,
  };
}

const FastLineChartConfig = require('@2security/fast-line-chart/nitrogen/generated/shared/json/FastLineChartConfig.json');

const NativeFastLineChartView = getHostComponent<
  FastLineChartProps,
  FastLineChartMethods
>('FastLineChart', () => FastLineChartConfig);

export const FastLineChartView = forwardRef<
  FastLineChartRef,
  FastLineChartViewProps
>(function FastLineChartViewImpl(
  { config, initialPoints, dataSets, onSelectPoint, ...rest },
  ref
) {
  const nativeRef = useRef<HybridFastLineChartViewType | null>(null);
  const pendingCalls = useRef<
    Array<(instance: HybridFastLineChartViewType) => void>
  >([]);

  const runOrQueue = useCallback(
    (action: (instance: HybridFastLineChartViewType) => void) => {
      if (nativeRef.current) {
        action(nativeRef.current);
      } else {
        pendingCalls.current.push(action);
      }
    },
    []
  );

  useImperativeHandle(
    ref,
    () => ({
      appendPoint(x: number, y: number, maxPoints?: number) {
        runOrQueue((inst) => inst.appendPoint(x, y, maxPoints));
      },
      appendPointsBatch(points: Point[], maxPoints?: number) {
        runOrQueue((inst) => inst.appendPointsBatch(points, maxPoints));
      },
      setDataPoints(points: Point[]) {
        runOrQueue((inst) => inst.setDataPoints(points));
      },
      setDataSets(sets: LineChartDataSet[]) {
        const normalized = sets.map(normalizeDataSet);
        runOrQueue((inst) => inst.setChartDataSets(normalized));
      },
      setChartDataSets(sets: LineChartDataSet[]) {
        const normalized = sets.map(normalizeDataSet);
        runOrQueue((inst) => inst.setChartDataSets(normalized));
      },
      clearData() {
        runOrQueue((inst) => inst.clearData());
      },
      setVisibleXRangeMaximum(maximum: number) {
        runOrQueue((inst) => inst.setVisibleXRangeMaximum(maximum));
      },
      moveViewToX(x: number) {
        runOrQueue((inst) => inst.moveViewToX(x));
      },
      fitScreen() {
        runOrQueue((inst) => inst.fitScreen());
      },
    }),
    [runOrQueue]
  );

  const wrappedOnSelectPoint = useMemo(() => {
    return onSelectPoint ? callback(onSelectPoint) : undefined;
  }, [onSelectPoint]);

  const wrappedHybridRef = useMemo(() => {
    return callback((instance: any) => {
      nativeRef.current = instance;
      if (instance && pendingCalls.current.length > 0) {
        const queue = pendingCalls.current;
        pendingCalls.current = [];
        queue.forEach((action) => action(instance));
      }
    });
  }, []);

  const normalizedConfig = useMemo(() => normalizeConfig(config), [config]);
  const normalizedDataSets = useMemo(
    () => (dataSets ? dataSets.map(normalizeDataSet) : undefined),
    [dataSets]
  );

  const nativeProps: Record<string, any> = {};
  if (normalizedConfig !== undefined) nativeProps.config = normalizedConfig;
  if (initialPoints !== undefined) nativeProps.initialPoints = initialPoints;
  if (normalizedDataSets !== undefined)
    nativeProps.dataSets = normalizedDataSets;
  if (wrappedOnSelectPoint !== undefined)
    nativeProps.onSelectPoint = wrappedOnSelectPoint;
  nativeProps.hybridRef = wrappedHybridRef;

  return <NativeFastLineChartView {...(rest as any)} {...nativeProps} />;
});
