import type { ViewProps } from 'react-native';
import type {
  FastLineChartMethods,
  LineChartConfig,
  LineChartDataSet,
  Point,
  SelectedPoint,
} from './FastLineChart.nitro';

export interface FastLineChartViewProps extends ViewProps {
  config?: LineChartConfig;
  initialPoints?: Point[];
  dataSets?: LineChartDataSet[];
  onSelectPoint?: (point: SelectedPoint) => void;
}

export interface FastLineChartRef extends FastLineChartMethods {
  setDataSets(sets: LineChartDataSet[]): void;
}
