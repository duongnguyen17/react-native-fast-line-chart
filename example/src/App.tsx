import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  FastLineChartView,
  type FastLineChartRef,
  type Point,
  type SelectedPoint,
  type LineChartConfig,
  type LineChartDataSet,
} from '@2security/fast-line-chart';

const TRAVEL_DATES = [
  'T2 15/10',
  'T3 16/10',
  'T4 17/10',
  'T5 18/10',
  'T6 19/10',
  'T7 20/10',
  'CN 21/10',
  'T2 22/10',
  'T3 23/10',
  'T4 24/10',
  'T5 25/10',
  'T6 26/10',
];

const TRAVEL_PRICES = [
  1.8, 1.5, 1.5, 1.5, 2.2, 2.6, 2.4, 1.9, 1.4, 1.4, 1.7, 2.0,
];

export default function App() {
  const chartRef = useRef<FastLineChartRef>(null);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // Stats
  const renderCount = useRef(0);
  renderCount.current += 1;

  // Tab: 'streaming' | 'travel'
  const [activeTab, setActiveTab] = useState<'streaming' | 'travel'>(
    'streaming'
  );

  // Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamSpeed, setStreamSpeed] = useState<20 | 60>(60);
  const [isBezier, setIsBezier] = useState(true);
  const [isFilled, setIsFilled] = useState(true);
  const [showCircles, setShowCircles] = useState(false);
  const [travelRevision, setTravelRevision] = useState(1);
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(
    null
  );

  // Streaming internal counters
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const xCounterRef = useRef(0);

  // 1. Streaming Chart Config
  const streamingConfig: LineChartConfig = useMemo(
    () => ({
      lineColor: '#007AFF',
      lineWidth: 2.2,
      mode: isBezier ? 'CUBIC_BEZIER' : 'LINEAR',
      drawFilled: isFilled,
      fillColor: '#007AFF',
      fillAlpha: 0.2,
      drawCircles: showCircles,
      circleColor: '#007AFF',
      circleRadius: 3.5,
      drawValues: false,
      drawGridLines: true,
      gridColor: '#E5E5EA',
      drawAxisLines: true,
      drawLabels: true,
      xAxisPosition: 'BOTTOM',
      textColor: '#8E8E93',
      textSize: 10,
      backgroundColor: '#FFFFFF',
      visibleRangeX: isLandscape ? 80 : 50,
      autoScroll: true,
      dragEnabled: true,
      scaleEnabled: true,
      pinchZoom: true,
    }),
    [isBezier, isFilled, showCircles, isLandscape]
  );

  // 2. Travel Search Chart Config & Datasets (Matching ai-travel-app)
  const travelConfig: LineChartConfig = useMemo(
    () => ({
      xAxisPosition: 'BOTTOM',
      xAxisValueFormatter: TRAVEL_DATES,
      drawGridLines: false,
      drawAxisLines: true,
      drawLabels: true,
      textColor: '#8E8E93',
      textSize: 10,
      backgroundColor: '#FFFFFF',
      dragEnabled: true,
      scaleEnabled: true,
      scaleXEnabled: true,
      scaleYEnabled: false,
      pinchZoom: true,
      extraOffsets: { top: 32, bottom: 8, left: 10, right: 10 },
    }),
    []
  );

  const travelDataSets: LineChartDataSet[] = useMemo(() => {
    // 1. Main price curve
    const values: Point[] = TRAVEL_PRICES.map((p, i) => ({ x: i, y: p }));

    // Consecutive duplicate formatters: e.g. "1.5M", "1.5M", "1.5M" -> only first shows!
    const valueFormatter = TRAVEL_PRICES.map((p) => `${p.toFixed(1)}M`);

    // Min price points
    const minVal = Math.min(...TRAVEL_PRICES);
    const minPoints = values.filter((pt) => pt.y === minVal);

    return [
      {
        values,
        label: 'Price',
        dataRevision: 1,
        config: {
          color: '#007AFF',
          lineWidth: 2.5,
          mode: 'HORIZONTAL_BEZIER',
          drawFilled: true,
          fillColor: '#007AFF',
          fillAlpha: 0.12,
          drawCircles: false,
          drawValues: true,
          valueTextColor: '#007AFF',
          valueTextSize: 10,
          valueFormatter,
          hideConsecutiveDuplicateValues: true, // Key feature from patch!
        },
      },
      {
        values: minPoints,
        label: 'Lowest Price Marker',
        dataRevision: 1,
        config: {
          color: '#34C759',
          drawCircles: true,
          circleColor: '#34C759',
          circleRadius: 5.0,
          drawCircleHole: true, // Key feature from patch!
          circleHoleColor: '#FFFFFF',
          circleHoleRadius: 2.5,
          drawValues: false,
          highlightEnabled: true,
        },
      },
    ];
  }, []);

  // Seed initial data for streaming
  const seedInitialData = useCallback(() => {
    const initial: Point[] = [];
    const count = isLandscape ? 60 : 40;
    for (let i = 0; i < count; i++) {
      const y = Math.sin(i * 0.25) * 20 + 50 + (Math.random() * 5 - 2.5);
      initial.push({ x: i, y });
    }
    xCounterRef.current = count;
    chartRef.current?.setDataPoints(initial);
  }, [isLandscape]);

  useEffect(() => {
    if (activeTab === 'streaming') {
      const timer = setTimeout(() => {
        seedInitialData();
      }, 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [activeTab, seedInitialData]);

  // Streaming loop (Zero React Re-render!)
  const startStreaming = (freqHz: 20 | 60) => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
    }

    const intervalMs = freqHz === 60 ? 16 : 50;
    setIsStreaming(true);
    setStreamSpeed(freqHz);

    streamIntervalRef.current = setInterval(() => {
      const x = xCounterRef.current++;
      const y =
        Math.sin(x * 0.15) * 25 +
        Math.cos(x * 0.05) * 10 +
        50 +
        (Math.random() * 6 - 3);

      chartRef.current?.appendPoint(x, y, 200);
    }, intervalMs);
  };

  const stopStreaming = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    setIsStreaming(false);
  };

  const appendBatch = () => {
    const batch: Point[] = [];
    for (let i = 0; i < 20; i++) {
      const x = xCounterRef.current++;
      const y = Math.sin(x * 0.2) * 20 + 50 + (Math.random() * 8 - 4);
      batch.push({ x, y });
    }
    chartRef.current?.appendPointsBatch(batch, 200);
  };

  const resetChart = () => {
    stopStreaming();
    chartRef.current?.clearData();
    xCounterRef.current = 0;
    setSelectedPoint(null);
  };

  const switchTab = (tab: 'streaming' | 'travel') => {
    stopStreaming();
    if (tab === 'streaming' && activeTab !== 'streaming') {
      chartRef.current?.clearData();
    }
    if (tab === 'travel' && activeTab !== 'travel') {
      setTravelRevision(1);
    }
    setSelectedPoint(null);
    setActiveTab(tab);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      {!isLandscape && (
        <View style={styles.header}>
          <Text style={styles.title}>Fast Line Chart</Text>
          <Text style={styles.subtitle}>
            Nitro Modules • Zero Re-renders • AI Travel Ready
          </Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'streaming' && styles.tabItemActive,
          ]}
          onPress={() => switchTab('streaming')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'streaming' && styles.tabTextActive,
            ]}
          >
            ⚡ 60Hz Streaming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'travel' && styles.tabItemActive,
          ]}
          onPress={() => switchTab('travel')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'travel' && styles.tabTextActive,
            ]}
          >
            ✈️ AI Travel Multi-Set
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Card */}
      <View
        style={[styles.statsCard, isLandscape && styles.statsCardLandscape]}
      >
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>REACT RENDERS</Text>
          <Text style={[styles.statValue, styles.statValueGreen]}>
            {renderCount.current}
          </Text>
          <Text style={styles.statNote}>(Zero during stream)</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>MODE</Text>
          <Text style={[styles.statValue, styles.statValueBlue]}>
            {activeTab === 'streaming'
              ? isStreaming
                ? `${streamSpeed} Hz`
                : 'STREAM'
              : 'AI TRAVEL'}
          </Text>
          <Text style={styles.statNote}>
            {activeTab === 'streaming'
              ? 'Max 200 pts sliding'
              : `Chart revision: ${travelRevision}`}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>TOUCH POINT</Text>
          <Text style={styles.statValue}>
            {selectedPoint
              ? `(${selectedPoint.x.toFixed(0)}, ${selectedPoint.y.toFixed(1)})`
              : 'Tap chart'}
          </Text>
          <Text style={styles.statNote}>
            {selectedPoint
              ? `px: (${selectedPoint.pixelX.toFixed(0)}, ${selectedPoint.pixelY.toFixed(0)})`
              : 'Inspect coords'}
          </Text>
          {activeTab === 'travel' && selectedPoint && (
            <Text testID="selected-revision" style={styles.statNote}>
              Selected revision: {selectedPoint.dataRevision ?? 'none'}
            </Text>
          )}
        </View>
      </View>

      {/* Native FastLineChart View Container */}
      <View
        style={[
          styles.chartContainer,
          isLandscape && { height: Math.max(180, height - 200) },
        ]}
      >
        <FastLineChartView
          ref={chartRef}
          style={styles.chart}
          config={activeTab === 'streaming' ? streamingConfig : travelConfig}
          dataSets={activeTab === 'travel' ? travelDataSets : undefined}
          onSelectPoint={(pt) => setSelectedPoint(pt)}
        />

        {/* Floating Tooltip positioned via pixelX & pixelY! */}
        {selectedPoint && (
          <View
            pointerEvents="none"
            style={[
              styles.floatingTooltip,
              {
                left: Math.max(8, selectedPoint.pixelX - 60),
                top: Math.max(6, selectedPoint.pixelY - 52),
              },
            ]}
          >
            <Text style={styles.tooltipTitle}>
              {activeTab === 'travel'
                ? (TRAVEL_DATES[Math.round(selectedPoint.x)] ??
                  `Day ${selectedPoint.x}`)
                : `X = ${selectedPoint.x.toFixed(0)}`}
            </Text>
            <Text style={styles.tooltipPrice}>
              {activeTab === 'travel'
                ? `${selectedPoint.y.toFixed(2)}M VNĐ`
                : `Y: ${selectedPoint.y.toFixed(2)}`}
            </Text>
          </View>
        )}
      </View>

      {/* Control Panel */}
      <ScrollView
        style={styles.controlsScroll}
        contentContainerStyle={styles.controlsContent}
      >
        {activeTab === 'streaming' ? (
          <>
            <Text style={styles.sectionTitle}>STREAMING ACTIONS</Text>
            <View style={styles.row}>
              {!isStreaming ? (
                <>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnPrimary]}
                    onPress={() => startStreaming(60)}
                  >
                    <Text style={styles.btnPrimaryText}>Start 60Hz</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnSecondary]}
                    onPress={() => startStreaming(20)}
                  >
                    <Text style={styles.btnSecondaryText}>Start 20Hz</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.btn, styles.btnDanger]}
                  onPress={stopStreaming}
                >
                  <Text style={styles.btnDangerText}>Stop Streaming</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.btn, styles.btnOutline]}
                onPress={appendBatch}
              >
                <Text style={styles.btnOutlineText}>+20 Batch</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>CHART TOGGLES</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.toggleBtn, isBezier && styles.toggleBtnActive]}
                onPress={() => setIsBezier((v) => !v)}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    isBezier && styles.toggleBtnTextActive,
                  ]}
                >
                  {isBezier ? 'Bezier: ON' : 'Bezier: OFF'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleBtn, isFilled && styles.toggleBtnActive]}
                onPress={() => setIsFilled((v) => !v)}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    isFilled && styles.toggleBtnTextActive,
                  ]}
                >
                  {isFilled ? 'Fill: ON' : 'Fill: OFF'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  showCircles && styles.toggleBtnActive,
                ]}
                onPress={() => setShowCircles((v) => !v)}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    showCircles && styles.toggleBtnTextActive,
                  ]}
                >
                  {showCircles ? 'Circles: ON' : 'Circles: OFF'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.btn, styles.btnOutline]}
                onPress={seedInitialData}
              >
                <Text style={styles.btnOutlineText}>Seed Initial Data</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnDangerOutline]}
                onPress={resetChart}
              >
                <Text style={styles.btnDangerOutlineText}>Clear Chart</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.travelNotesCard}>
            <TouchableOpacity
              testID="replace-travel-revision"
              accessibilityLabel="Replace travel dataset"
              style={[styles.btn, styles.btnOutline]}
              onPress={() => {
                const nextRevision = travelRevision + 1;
                chartRef.current?.setDataSets(
                  travelDataSets.map((set) => ({
                    ...set,
                    dataRevision: nextRevision,
                  }))
                );
                setTravelRevision(nextRevision);
                setSelectedPoint(null);
              }}
            >
              <Text style={styles.btnOutlineText}>Replace travel dataset</Text>
            </TouchableOpacity>
            <Text style={styles.travelNotesTitle}>
              AI Travel App Features Verified:
            </Text>
            <Text style={styles.travelNotesItem}>
              ✓ <Text style={styles.travelNotesEmphasis}>pixelX & pixelY</Text>:
              Floating Tooltip positions exactly above touched point.
            </Text>
            <Text style={styles.travelNotesItem}>
              ✓{' '}
              <Text style={styles.travelNotesEmphasis}>
                hideConsecutiveDuplicateValues
              </Text>
              : Duplicate 1.5M & 1.4M values keep only the first label.
            </Text>
            <Text style={styles.travelNotesItem}>
              ✓{' '}
              <Text style={styles.travelNotesEmphasis}>
                xAxisValueFormatter
              </Text>
              : Formatted weekday & dates on X axis (T2 15/10, etc.).
            </Text>
            <Text style={styles.travelNotesItem}>
              ✓ <Text style={styles.travelNotesEmphasis}>Circle Hole</Text>:
              Green ring with white center on the lowest price point (1.4M).
            </Text>
            <Text style={styles.travelNotesItem}>
              ✓ <Text style={styles.travelNotesEmphasis}>Multi-DataSet</Text>:
              Main curve and marker datasets combined cleanly.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000000',
  },
  subtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    padding: 3,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '700',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statsCardLandscape: {
    marginVertical: 4,
    paddingVertical: 6,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  statValueGreen: {
    color: '#34C759',
  },
  statValueBlue: {
    color: '#007AFF',
  },
  statNote: {
    fontSize: 9,
    color: '#AEAEB2',
    marginTop: 2,
  },
  chartContainer: {
    height: 310,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  chart: {
    flex: 1,
  },
  floatingTooltip: {
    position: 'absolute',
    width: 120,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  tooltipTitle: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '600',
  },
  tooltipPrice: {
    color: '#34C759',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 1,
  },
  controlsScroll: {
    flex: 1,
    marginTop: 6,
  },
  controlsContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    marginTop: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: '#007AFF',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  btnSecondary: {
    backgroundColor: '#34C759',
  },
  btnSecondaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  btnDanger: {
    backgroundColor: '#FF3B30',
  },
  btnDangerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  btnOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#007AFF',
  },
  btnOutlineText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '700',
  },
  btnDangerOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FF3B30',
  },
  btnDangerOutlineText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '700',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#007AFF',
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  travelNotesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  travelNotesTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  travelNotesEmphasis: {
    fontWeight: '700',
  },
  travelNotesItem: {
    fontSize: 12,
    color: '#3A3A3C',
    lineHeight: 20,
    marginBottom: 4,
  },
});
