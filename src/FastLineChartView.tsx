import { forwardRef } from 'react';
import type {
  FastLineChartRef,
  FastLineChartViewProps,
} from './FastLineChartView.types';

export type {
  FastLineChartRef,
  FastLineChartViewProps,
} from './FastLineChartView.types';

export const FastLineChartView = forwardRef<
  FastLineChartRef,
  FastLineChartViewProps
>(function FastLineChartViewImpl(_props, _ref): never {
  throw new Error(
    "'@2security/fast-line-chart' is only supported on native platforms (iOS and Android)."
  );
});
