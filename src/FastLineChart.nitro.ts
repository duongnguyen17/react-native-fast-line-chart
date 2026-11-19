import type {
  HybridView,
  HybridViewMethods,
  HybridViewProps,
} from 'react-native-nitro-modules';

export interface FastLineChartProps extends HybridViewProps {
  color: string;
}
export interface FastLineChartMethods extends HybridViewMethods {}

export type FastLineChart = HybridView<
  FastLineChartProps,
  FastLineChartMethods
>;
