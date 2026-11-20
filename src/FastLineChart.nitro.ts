import type {
  HybridView,
  HybridViewMethods,
  HybridViewProps,
} from 'react-native-nitro-modules';

export interface Point {
  x: number;
  y: number;
}

export interface SelectedPoint {
  x: number;
  y: number;
  pixelX: number;
  pixelY: number;
  dataIndex?: number;
  dataSetIndex?: number;
  dataRevision?: number;
}

export interface ExtraOffsets {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
}

export interface LineDataSetConfig {
  color?: string;
  lineWidth?: number;
  drawCircles?: boolean;
  circleColor?: string;
  circleRadius?: number;
  drawCircleHole?: boolean;
  circleHoleColor?: string;
  circleHoleRadius?: number;
  drawValues?: boolean;
  valueTextColor?: string;
  valueTextSize?: number;
  valueFormatter?: string[];
  hideConsecutiveDuplicateValues?: boolean;
  mode?: string; // 'LINEAR' | 'CUBIC_BEZIER' | 'STEPPED' | 'HORIZONTAL_BEZIER'
  drawFilled?: boolean;
  fillColor?: string;
  fillAlpha?: number;
  highlightEnabled?: boolean;
}

export interface LineChartDataSet {
  values: Point[];
  label?: string;
  config?: LineDataSetConfig;
  dataRevision?: number;
}

interface LineAxisStyle {
  axisLineColor?: string;
  gridColor?: string;
  textColor?: string;
  drawAxisLine?: boolean;
  drawGridLines?: boolean;
  drawLabels?: boolean;
  textSize?: number;
  granularity?: number;
  granularityEnabled?: boolean;
}

export interface LineXAxisConfig extends LineAxisStyle {
  position?: string;
  valueFormatter?: string[];
}

export interface LineYAxisConfig extends LineAxisStyle {
  axisMinimum?: number;
  valueFormatter?: string;
}

export interface LineChartConfig {
  // Global & Axis Styling
  backgroundColor?: string;
  gridColor?: string;
  drawGridLines?: boolean;
  drawAxisLines?: boolean;
  drawLabels?: boolean;
  xAxisPosition?: string; // 'TOP' | 'BOTTOM' | 'BOTH_SIDED' | 'TOP_INSIDE' | 'BOTTOM_INSIDE'
  xAxisValueFormatter?: string[];
  textColor?: string;
  textSize?: number;
  visibleRangeX?: number;
  autoScroll?: boolean;
  descriptionText?: string;
  legendEnabled?: boolean;
  dragEnabled?: boolean;
  scaleEnabled?: boolean;
  scaleXEnabled?: boolean;
  scaleYEnabled?: boolean;
  pinchZoom?: boolean;
  highlightEnabled?: boolean;
  extraOffsets?: ExtraOffsets;
  xAxis?: LineXAxisConfig;
  yAxis?: LineYAxisConfig;
  maxVisibleValueCount?: number;
  noDataText?: string;
  animationDurationX?: number;

  // Single-dataset convenience styling
  lineColor?: string;
  lineWidth?: number;
  drawCircles?: boolean;
  circleColor?: string;
  circleRadius?: number;
  drawCircleHole?: boolean;
  circleHoleColor?: string;
  circleHoleRadius?: number;
  drawValues?: boolean;
  valueTextColor?: string;
  valueTextSize?: number;
  valueFormatter?: string[];
  hideConsecutiveDuplicateValues?: boolean;
  mode?: string;
  drawFilled?: boolean;
  fillColor?: string;
  fillAlpha?: number;
}

export interface FastLineChartProps extends HybridViewProps {
  config?: LineChartConfig;
  initialPoints?: Point[];
  dataSets?: LineChartDataSet[];
  onSelectPoint?: (point: SelectedPoint) => void;
}

export interface FastLineChartMethods extends HybridViewMethods {
  appendPoint(x: number, y: number, maxPoints?: number): void;
  appendPointsBatch(points: Point[], maxPoints?: number): void;
  setDataPoints(points: Point[]): void;
  setChartDataSets(dataSets: LineChartDataSet[]): void;
  clearData(): void;
  setVisibleXRangeMaximum(maximum: number): void;
  moveViewToX(x: number): void;
  fitScreen(): void;
}

export type FastLineChart = HybridView<
  FastLineChartProps,
  FastLineChartMethods
>;
