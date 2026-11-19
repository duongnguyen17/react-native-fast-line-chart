import { forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import { getHostComponent, callback } from 'react-native-nitro-modules';
import type {
  FastLineChartProps,
  FastLineChartMethods,
  FastLineChart as HybridFastLineChartViewType,
  Point,
  LineChartDataSet,
} from './FastLineChart.nitro';
import type {
  FastLineChartRef,
  FastLineChartViewProps,
} from './FastLineChartView.types';

export type {
  FastLineChartRef,
  FastLineChartViewProps,
} from './FastLineChartView.types';

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

  useImperativeHandle(
    ref,
    () => ({
      appendPoint(x: number, y: number, maxPoints?: number) {
        nativeRef.current?.appendPoint(x, y, maxPoints);
      },
      appendPointsBatch(points: Point[], maxPoints?: number) {
        nativeRef.current?.appendPointsBatch(points, maxPoints);
      },
      setDataPoints(points: Point[]) {
        nativeRef.current?.setDataPoints(points);
      },
      setDataSets(sets: LineChartDataSet[]) {
        nativeRef.current?.setChartDataSets(sets);
      },
      setChartDataSets(sets: LineChartDataSet[]) {
        nativeRef.current?.setChartDataSets(sets);
      },
      clearData() {
        nativeRef.current?.clearData();
      },
      setVisibleXRangeMaximum(maximum: number) {
        nativeRef.current?.setVisibleXRangeMaximum(maximum);
      },
      moveViewToX(x: number) {
        nativeRef.current?.moveViewToX(x);
      },
      fitScreen() {
        nativeRef.current?.fitScreen();
      },
    }),
    []
  );

  const wrappedOnSelectPoint = useMemo(() => {
    return onSelectPoint ? callback(onSelectPoint) : undefined;
  }, [onSelectPoint]);

  const wrappedHybridRef = useMemo(() => {
    return callback((instance: any) => {
      nativeRef.current = instance;
    });
  }, []);

  const nativeProps: Record<string, any> = {};
  if (config !== undefined) nativeProps.config = config;
  if (initialPoints !== undefined) nativeProps.initialPoints = initialPoints;
  if (dataSets !== undefined) nativeProps.dataSets = dataSets;
  if (wrappedOnSelectPoint !== undefined)
    nativeProps.onSelectPoint = wrappedOnSelectPoint;
  nativeProps.hybridRef = wrappedHybridRef;

  return <NativeFastLineChartView {...(rest as any)} {...nativeProps} />;
});
