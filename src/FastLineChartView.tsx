import type { ViewProps } from 'react-native';

type Props = ViewProps & {
  color: string;
};

export function FastLineChartView(_props: Props): never {
  throw new Error(
    "'react-native-fast-line-chart' is only supported on native platforms."
  );
}
