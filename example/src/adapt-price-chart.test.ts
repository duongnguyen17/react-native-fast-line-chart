import { describe, expect, it } from '@jest/globals';
import { adaptPriceChart } from './adapt-price-chart';

describe('adaptPriceChart', () => {
  it('adapts extrema markers, chart axes, and the wrapper color representation', () => {
    const labels = ['1.2M', '1.2M', '', '1.2M'];
    const extrema = [0, 1, 3].map((x) => ({
      values: [{ x, y: 1.2 }],
      config: {
        drawValues: true,
        valueFormatter: labels,
        hideConsecutiveDuplicateValues: true,
        circleColor: -2136224273,
        circleHoleColor: 0xffefffff,
        valueTextColor: null,
      },
    }));
    const result = adaptPriceChart({
      data: { dataSets: extrema },
      xAxis: {
        position: 'BOTTOM',
        drawGridLines: false,
        valueFormatter: ['Mon', 'Tue', 'Wed', 'Thu'],
        axisLineColor: 0,
      },
      yAxis: {
        left: {
          axisMinimum: 0.9,
          valueFormatter: '#,##0.0#M',
          drawGridLines: true,
          gridColor: 0xffdddddd,
        },
      },
      animation: { durationX: 500 },
      extraOffsets: { top: 48, right: 20 },
    });

    expect(result.config).toMatchObject({
      xAxis: {
        position: 'BOTTOM',
        drawGridLines: false,
        axisLineColor: '#00000000',
      },
      yAxis: {
        axisMinimum: 0.9,
        valueFormatter: '#,##0.0#M',
        gridColor: '#ffdddddd',
      },
      animationDurationX: 500,
      extraOffsets: { top: 48, right: 20 },
      noDataText: '',
      scaleYEnabled: false,
    });
    expect(result.dataSets[0]?.config).toMatchObject({
      hideConsecutiveDuplicateValues: true,
      circleColor: '#80abcdef',
      circleHoleColor: '#ffefffff',
    });
    expect(result.dataSets[0]?.config?.valueTextColor).toBeUndefined();
    expect(result.dataSets[1]?.config?.valueFormatter).toBe(labels);
    expect(result.dataSets[2]?.values).toBe(extrema[2]?.values);
  });

  it('counts all three comparison lines and marker entries for the label limit', () => {
    const values = Array.from({ length: 35 }, (_, x) => ({ x, y: 1 + x / 10 }));
    const chart = {
      data: {
        dataSets: [
          ...Array.from({ length: 3 }, () => ({
            values,
            config: { drawValues: false },
          })),
          { values: [{ x: 0, y: 1 }], config: { drawValues: true } },
        ],
      },
      xAxis: {},
      yAxis: { left: {} },
    };

    expect(adaptPriceChart(chart).config.maxVisibleValueCount).toBe(107);
    expect(
      adaptPriceChart({ ...chart, maxVisibleValueCount: 200 }).config
        .maxVisibleValueCount
    ).toBe(200);
  });
});
