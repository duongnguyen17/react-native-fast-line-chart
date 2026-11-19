import type { ColorValue, ViewProps } from 'react-native';
import type {
  ExtraOffsets,
  FastLineChartMethods,
  LineChartConfig as NativeLineChartConfig,
  LineChartDataSet as NativeLineChartDataSet,
  LineDataSetConfig as NativeLineDataSetConfig,
  LineXAxisConfig as NativeLineXAxisConfig,
  LineYAxisConfig as NativeLineYAxisConfig,
  Point,
  SelectedPoint,
} from './FastLineChart.nitro';

export type ChartColor = ColorValue | string | number;

export interface LineDataSetConfig extends Omit<
  NativeLineDataSetConfig,
  'color' | 'circleColor' | 'circleHoleColor' | 'valueTextColor' | 'fillColor'
> {
  color?: ChartColor;
  circleColor?: ChartColor;
  circleHoleColor?: ChartColor;
  valueTextColor?: ChartColor;
  fillColor?: ChartColor;
}

export interface LineChartDataSet extends Omit<
  NativeLineChartDataSet,
  'config'
> {
  values: Point[];
  label?: string;
  config?: LineDataSetConfig;
}

export interface LineXAxisConfig extends Omit<
  NativeLineXAxisConfig,
  'axisLineColor' | 'gridColor' | 'textColor'
> {
  axisLineColor?: ChartColor;
  gridColor?: ChartColor;
  textColor?: ChartColor;
}

export interface LineYAxisConfig extends Omit<
  NativeLineYAxisConfig,
  'axisLineColor' | 'gridColor' | 'textColor'
> {
  axisLineColor?: ChartColor;
  gridColor?: ChartColor;
  textColor?: ChartColor;
}

export interface LineChartConfig extends Omit<
  NativeLineChartConfig,
  | 'backgroundColor'
  | 'gridColor'
  | 'textColor'
  | 'lineColor'
  | 'circleColor'
  | 'circleHoleColor'
  | 'valueTextColor'
  | 'fillColor'
  | 'xAxis'
  | 'yAxis'
> {
  backgroundColor?: ChartColor;
  gridColor?: ChartColor;
  textColor?: ChartColor;
  lineColor?: ChartColor;
  circleColor?: ChartColor;
  circleHoleColor?: ChartColor;
  valueTextColor?: ChartColor;
  fillColor?: ChartColor;
  xAxis?: LineXAxisConfig;
  yAxis?: LineYAxisConfig;
}

export interface FastLineChartViewProps extends ViewProps {
  config?: LineChartConfig;
  initialPoints?: Point[];
  dataSets?: LineChartDataSet[];
  onSelectPoint?: (point: SelectedPoint) => void;
}

export interface FastLineChartRef extends FastLineChartMethods {
  setDataSets(sets: LineChartDataSet[]): void;
}

export type { ExtraOffsets, Point, SelectedPoint };
