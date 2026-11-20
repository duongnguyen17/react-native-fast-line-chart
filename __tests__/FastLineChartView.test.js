const fs = require('fs');
const path = require('path');
const vm = require('vm');
const babel = require('@babel/core');

// Exercise the public wrapper without a native runtime. The mocked host exposes
// the same hybridRef callback Nitro uses to supply the native instance.
function renderChart(props = {}) {
  const publicRef = { current: null };
  const react = {
    forwardRef: (render) => render,
    useRef: (initial) => ({ current: initial ?? null }),
    useCallback: (fn) => fn,
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
    if (id === 'react-native')
      return {
        processColor: (c) => (typeof c === 'number' ? c : 0xff007aff),
      };
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
  const point = { x: 1, y: 2, pixelX: 3, pixelY: 4, dataRevision: 3 };
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
  const sets = [{ values: points, dataRevision: 4 }];
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

test('queues imperative calls made before native attachment and flushes on attach', () => {
  const { element, ref } = renderChart();
  const native = {
    setChartDataSets: jest.fn(),
  };
  const sets = [{ values: [{ x: 1, y: 10 }] }];
  // Called before element.props.hybridRef is invoked:
  ref.setDataSets(sets);
  expect(native.setChartDataSets).not.toHaveBeenCalled();

  // Native attaches:
  element.props.hybridRef(native);
  expect(native.setChartDataSets).toHaveBeenCalledTimes(1);
  expect(native.setChartDataSets).toHaveBeenCalledWith(sets);
});

test('normalizes string and number colors to hex for native host', () => {
  const config = {
    lineColor: 0xff007aff, // number (ARGB integer from processColor)
    backgroundColor: '#ffffff', // hex string
    xAxis: {
      textColor: 0xff8e8e93,
    },
  };
  const dataSets = [
    {
      values: [{ x: 1, y: 2 }],
      dataRevision: 5,
      config: {
        circleColor: 0xff34c759,
        circleHoleColor: '#ffffff',
      },
    },
  ];
  const { element } = renderChart({ config, dataSets });
  expect(element.props.config.lineColor).toBe('#ff007aff');
  expect(element.props.config.backgroundColor).toBe('#ffffff');
  expect(element.props.config.xAxis.textColor).toBe('#ff8e8e93');
  expect(element.props.dataSets[0].config.circleColor).toBe('#ff34c759');
  expect(element.props.dataSets[0].config.circleHoleColor).toBe('#ffffff');
  expect(element.props.dataSets[0].dataRevision).toBe(5);
});
