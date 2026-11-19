import { getHostComponent } from 'react-native-nitro-modules';
import type {
  FastLineChartMethods,
  FastLineChartProps,
} from './FastLineChart.nitro';

const FastLineChartConfig = require('react-native-fast-line-chart/nitrogen/generated/shared/json/FastLineChartConfig.json');

export const FastLineChartView = getHostComponent<
  FastLineChartProps,
  FastLineChartMethods
>('FastLineChart', () => FastLineChartConfig);
