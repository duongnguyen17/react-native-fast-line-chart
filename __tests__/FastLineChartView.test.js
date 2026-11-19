const fs = require('fs');
const path = require('path');
const vm = require('vm');
const babel = require('@babel/core');

// Exercise the public wrapper without a native runtime. The mocked host exposes
// the same hybridRef callback Nitro uses to supply the native instance.
function renderChart(props = {}) {
  const nativeRef = { current: null };
  const publicRef = { current: null };
  const react = {
    forwardRef: (render) => render,
    useRef: () => nativeRef,
    useMemo: (factory) => factory(),
    useImperativeHandle: (ref, factory) => {
      ref.current = factory();
    },
  };
  const host = () => null;
  const nitro = { getHostComponent: () => host, callback: (fn) => fn };
  const file = path.join(__dirname, '../src/FastLineChartView.native.tsx');
  const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file,
    babelrc: false,
    configFile: false,
    presets: [
      ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
    ],
    plugins: [
      ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
      '@babel/plugin-transform-modules-commonjs',
    ],
  });
  const exports = {};
  const requireMock = (id) => {
    if (id === 'react') return react;
    if (id === 'react/jsx-runtime')
      return { jsx: (type, p) => ({ type, props: p }) };
    if (id === 'react-native-nitro-modules') return nitro;
    if (id.endsWith('FastLineChartConfig.json')) return {};
    throw new Error(`Unexpected import: ${id}`);
  };
  vm.runInNewContext(code, { require: requireMock, exports });
  const element = exports.FastLineChartView(props, publicRef);
  return { element, ref: publicRef.current };
}

test('forwards provided props and selection events to the host', () => {
  const selected = jest.fn();
  const config = { drawCircles: true };
  const points = [{ x: 1, y: 2 }];
  const { element } = renderChart({
    config,
    initialPoints: points,
    onSelectPoint: selected,
    testID: 'chart',
  });
  expect(element.props).toEqual(
    expect.objectContaining({ config, initialPoints: points, testID: 'chart' })
  );
  expect(element.props).not.toHaveProperty('dataSets');
  const point = { x: 1, y: 2, pixelX: 3, pixelY: 4 };
  element.props.onSelectPoint(point);
  expect(selected).toHaveBeenCalledWith(point);
});

test('forwards imperative calls to the attached native instance and tolerates detach', () => {
  const { element, ref } = renderChart();
  const native = {
    appendPoint: jest.fn(),
    appendPointsBatch: jest.fn(),
    setDataPoints: jest.fn(),
    setChartDataSets: jest.fn(),
    clearData: jest.fn(),
    setVisibleXRangeMaximum: jest.fn(),
    moveViewToX: jest.fn(),
    fitScreen: jest.fn(),
  };
  const points = [{ x: 1, y: 2 }];
  const sets = [{ values: points }];
  element.props.hybridRef(native);
  ref.appendPoint(1, 2, 5);
  ref.appendPointsBatch(points, 5);
  ref.setDataPoints(points);
  ref.setDataSets(sets);
  ref.setChartDataSets(sets);
  ref.clearData();
  ref.setVisibleXRangeMaximum(10);
  ref.moveViewToX(3);
  ref.fitScreen();
  expect(native.appendPoint).toHaveBeenCalledWith(1, 2, 5);
  expect(native.appendPointsBatch).toHaveBeenCalledWith(points, 5);
  expect(native.setDataPoints).toHaveBeenCalledWith(points);
  expect(native.setChartDataSets).toHaveBeenCalledTimes(2);
  expect(native.setChartDataSets).toHaveBeenCalledWith(sets);
  expect(native.clearData).toHaveBeenCalledTimes(1);
  expect(native.setVisibleXRangeMaximum).toHaveBeenCalledWith(10);
  expect(native.moveViewToX).toHaveBeenCalledWith(3);
  expect(native.fitScreen).toHaveBeenCalledTimes(1);
  element.props.hybridRef(null);
  expect(() => ref.appendPoint(1, 2)).not.toThrow();
  expect(native.appendPoint).toHaveBeenCalledTimes(1);
});
