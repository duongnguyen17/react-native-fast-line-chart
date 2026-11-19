package com.margelo.nitro.fastlinechart

import android.graphics.Color
import android.os.Handler
import android.os.Looper
import android.view.Choreographer
import android.view.View
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.ThemedReactContext
import com.github.mikephil.charting.charts.LineChart
import com.github.mikephil.charting.components.XAxis
import com.github.mikephil.charting.data.Entry
import com.github.mikephil.charting.data.LineData
import com.github.mikephil.charting.data.LineDataSet
import com.github.mikephil.charting.formatter.ValueFormatter
import com.github.mikephil.charting.highlight.Highlight
import com.github.mikephil.charting.listener.OnChartValueSelectedListener
import com.github.mikephil.charting.renderer.LineChartRenderer
import java.util.concurrent.atomic.AtomicBoolean
import java.text.DecimalFormat

// MARK: - Value Formatters

private class IndexAxisValueFormatter(private val values: Array<String>) : ValueFormatter() {
  override fun getFormattedValue(value: Float): String {
    val index = Math.round(value)
    return if (index >= 0 && index < values.size) values[index] else ""
  }
}

private class DataSetValueFormatter(
  labels: Array<String>,
  hideConsecutiveDuplicates: Boolean
) : ValueFormatter() {
  private val processedLabels: Array<String> = if (hideConsecutiveDuplicates) {
    Array(labels.size) { i ->
      val label = labels[i]
      if (label.isNotEmpty() && i > 0 && label == labels[i - 1]) "" else label
    }
  } else {
    labels
  }

  override fun getPointLabel(entry: Entry?): String {
    if (entry == null) return ""
    val index = Math.round(entry.x)
    return if (index >= 0 && index < processedLabels.size) processedLabels[index] else ""
  }
}

// MARK: - Main Hybrid View

@DoNotStrip
@Keep
class HybridFastLineChart(val context: ThemedReactContext) : HybridFastLineChartSpec(),
  OnChartValueSelectedListener {

  override val view: View = LineChart(context).apply {
    setOnChartValueSelectedListener(this@HybridFastLineChart)
    description.isEnabled = false
    legend.isEnabled = false
    axisRight.isEnabled = false
    isDragEnabled = true
    setScaleEnabled(true)
    setPinchZoom(true)
    setDrawGridBackground(false)
    setNoDataText("No chart data available")
  }

  private val chartView: LineChart
    get() = view as LineChart

  private val mainHandler = Handler(Looper.getMainLooper())
  private var singleDataSet: LineDataSet? = null
  private var multiDataSetMode = false
  private var needsDataSetRecalc = false
  private val isFrameScheduled = AtomicBoolean(false)
  private var lastAppendedX: Float = 0f

  private val frameCallback = Choreographer.FrameCallback {
    isFrameScheduled.set(false)
    val data = chartView.data ?: return@FrameCallback
    if (needsDataSetRecalc) {
      singleDataSet?.notifyDataSetChanged()
      needsDataSetRecalc = false
    }
    data.notifyDataChanged()
    chartView.notifyDataSetChanged()

    val visibleX = config?.visibleRangeX
    val range = chartView.xAxis.axisMaximum - chartView.xAxis.axisMinimum
    if (visibleX != null && visibleX > 0 && range > visibleX) {
      chartView.setVisibleXRangeMaximum(visibleX.toFloat())
    }

    if (config?.autoScroll != false) {
      chartView.moveViewToX(lastAppendedX)
    }

    chartView.postInvalidateOnAnimation()
  }

  // Props
  private var _config: LineChartConfig? = null
  override var config: LineChartConfig?
    get() = _config
    set(value) {
      _config = value
      runOnMain { applyConfig() }
    }

  private var _initialPoints: Array<Point>? = null
  override var initialPoints: Array<Point>?
    get() = _initialPoints
    set(value) {
      _initialPoints = value
      if (value != null) {
        runOnMain { setDataPoints(value) }
      }
    }

  private var _dataSets: Array<LineChartDataSet>? = null
  override var dataSets: Array<LineChartDataSet>?
    get() = _dataSets
    set(value) {
      _dataSets = value
      if (value != null) {
        runOnMain { setChartDataSets(value) }
      }
    }

  override var onSelectPoint: ((point: SelectedPoint) -> Unit)? = null

  private fun runOnMain(block: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper()) {
      block()
    } else {
      mainHandler.post(block)
    }
  }

  private fun scheduleRedraw(lastX: Float) {
    lastAppendedX = lastX
    if (isFrameScheduled.compareAndSet(false, true)) {
      Choreographer.getInstance().postFrameCallback(frameCallback)
    }
  }

  private fun cancelScheduledFrame() {
    needsDataSetRecalc = false
    if (isFrameScheduled.getAndSet(false)) {
      Choreographer.getInstance().removeFrameCallback(frameCallback)
    }
  }

  private fun resetDataRenderer() {
    // LineChartRenderer retains per-dataset circle caches, and initBuffers() does not clear them.
    (chartView.renderer as? LineChartRenderer)?.releaseBitmap()
    chartView.renderer = LineChartRenderer(chartView, chartView.animator, chartView.viewPortHandler)
  }

  private fun getOrCreateSingleDataSet(): LineDataSet {
    val existing = singleDataSet
    if (existing != null && chartView.data != null) {
      return existing
    }

    val set = existing ?: LineDataSet(mutableListOf<Entry>(), "Dataset")
    configureSingleDataSet(set)
    this.singleDataSet = set

    val data = LineData(set)
    chartView.data = data

    return set
  }

  private fun configureSingleDataSet(set: LineDataSet) {
    val cfg = config
    val lineColor = parseColor(cfg?.lineColor, Color.parseColor("#2196F3"))
    set.color = lineColor
    set.lineWidth = (cfg?.lineWidth ?: 2.0).toFloat()

    val drawCircles = cfg?.drawCircles ?: false
    set.setDrawCircles(drawCircles)
    if (drawCircles) {
      val circleColor = parseColor(cfg?.circleColor, lineColor)
      set.setCircleColor(circleColor)
      set.circleRadius = (cfg?.circleRadius ?: 3.5).toFloat()
    }

    // Circle Hole
    val drawHole = cfg?.drawCircleHole ?: false
    set.setDrawCircleHole(drawHole)
    if (drawHole) {
      set.circleHoleRadius = (cfg?.circleHoleRadius ?: 2.0).toFloat()
      set.circleHoleColor = parseColor(cfg?.circleHoleColor, Color.WHITE)
    }

    val drawValues = cfg?.drawValues ?: false
    set.setDrawValues(drawValues)
    set.valueTextColor = parseColor(cfg?.valueTextColor, Color.BLACK)
    set.valueTextSize = (cfg?.valueTextSize ?: 10.0).toFloat()

    // Value Formatter & Consecutive Duplicate Suppression
    val formatter = cfg?.valueFormatter
    if (formatter != null && formatter.isNotEmpty()) {
      val hideDuplicates = cfg?.hideConsecutiveDuplicateValues ?: false
      set.valueFormatter = DataSetValueFormatter(formatter, hideDuplicates)
    } else {
      set.valueFormatter = null
    }

    // Line Mode
    when (cfg?.mode?.uppercase()) {
      "CUBIC_BEZIER" -> set.mode = LineDataSet.Mode.CUBIC_BEZIER
      "STEPPED" -> set.mode = LineDataSet.Mode.STEPPED
      "HORIZONTAL_BEZIER" -> set.mode = LineDataSet.Mode.HORIZONTAL_BEZIER
      else -> set.mode = LineDataSet.Mode.LINEAR
    }

    // Fill
    val drawFilled = cfg?.drawFilled ?: false
    set.setDrawFilled(drawFilled)
    if (drawFilled) {
      val fillColor = parseColor(cfg?.fillColor, lineColor)
      set.fillColor = fillColor
      val alpha = ((cfg?.fillAlpha ?: 0.25) * 255).toInt().coerceIn(0, 255)
      set.fillAlpha = alpha
    }

    set.isHighlightEnabled = cfg?.highlightEnabled ?: true
  }

  private fun configureCustomDataSet(set: LineDataSet, cfg: LineDataSetConfig?) {
    val lineColor = parseColor(cfg?.color, Color.parseColor("#2196F3"))
    set.color = lineColor
    set.lineWidth = (cfg?.lineWidth ?: 2.0).toFloat()

    val drawCircles = cfg?.drawCircles ?: false
    set.setDrawCircles(drawCircles)
    if (drawCircles) {
      val circleColor = parseColor(cfg?.circleColor, lineColor)
      set.setCircleColor(circleColor)
      set.circleRadius = (cfg?.circleRadius ?: 3.5).toFloat()
    }

    // Circle Hole
    val drawHole = cfg?.drawCircleHole ?: false
    set.setDrawCircleHole(drawHole)
    if (drawHole) {
      set.circleHoleRadius = (cfg?.circleHoleRadius ?: 2.0).toFloat()
      cfg?.circleHoleColor?.let { set.circleHoleColor = parseColor(it, Color.WHITE) }
    }

    val drawValues = cfg?.drawValues ?: false
    set.setDrawValues(drawValues)
    cfg?.valueTextColor?.let { set.valueTextColor = parseColor(it, Color.BLACK) }
    cfg?.valueTextSize?.let { set.valueTextSize = it.toFloat() }

    val formatter = cfg?.valueFormatter
    if (formatter != null && formatter.isNotEmpty()) {
      val hideDuplicates = cfg?.hideConsecutiveDuplicateValues ?: false
      set.valueFormatter = DataSetValueFormatter(formatter, hideDuplicates)
    } else {
      set.valueFormatter = null
    }

    when (cfg?.mode?.uppercase()) {
      "CUBIC_BEZIER" -> set.mode = LineDataSet.Mode.CUBIC_BEZIER
      "STEPPED" -> set.mode = LineDataSet.Mode.STEPPED
      "HORIZONTAL_BEZIER" -> set.mode = LineDataSet.Mode.HORIZONTAL_BEZIER
      else -> set.mode = LineDataSet.Mode.LINEAR
    }

    val drawFilled = cfg?.drawFilled ?: false
    set.setDrawFilled(drawFilled)
    if (drawFilled) {
      val fillColor = parseColor(cfg?.fillColor, lineColor)
      set.fillColor = fillColor
      val alpha = ((cfg?.fillAlpha ?: 0.25) * 255).toInt().coerceIn(0, 255)
      set.fillAlpha = alpha
    }

    set.isHighlightEnabled = cfg?.highlightEnabled ?: true
  }

  // MARK: - Hybrid Methods

  override fun appendPoint(x: Double, y: Double, maxPoints: Double?) {
    if (!x.isFinite() || !y.isFinite() || !x.toFloat().isFinite() || !y.toFloat().isFinite()) return
    runOnMain {
      if (multiDataSetMode) return@runOnMain
      val set = getOrCreateSingleDataSet()
      set.addEntry(Entry(x.toFloat(), y.toFloat()))

      if (maxPoints != null && maxPoints.isFinite() && maxPoints >= 1) {
        val max = maxPoints.toInt()
        val excess = set.entryCount - max
        if (excess > 0) {
          set.values.subList(0, excess).clear()
          needsDataSetRecalc = true
        }
      }

      scheduleRedraw(x.toFloat())
    }
  }

  override fun appendPointsBatch(points: Array<Point>, maxPoints: Double?) {
    val validPoints = points.filter { validPoint(it) }
    if (validPoints.isEmpty()) return

    runOnMain {
      if (multiDataSetMode) return@runOnMain
      val set = getOrCreateSingleDataSet()
      var lastX = validPoints.last().x.toFloat()

      for (pt in validPoints) {
        val fx = pt.x.toFloat()
        set.addEntry(Entry(fx, pt.y.toFloat()))
        lastX = fx
      }

      if (maxPoints != null && maxPoints.isFinite() && maxPoints >= 1) {
        val max = maxPoints.toInt()
        val excess = set.entryCount - max
        if (excess > 0) {
          set.values.subList(0, excess).clear()
          needsDataSetRecalc = true
        }
      }

      scheduleRedraw(lastX)
    }
  }

  private fun validPoint(point: Point): Boolean =
    point.x.isFinite() && point.y.isFinite() && point.x.toFloat().isFinite() && point.y.toFloat().isFinite()

  override fun setDataPoints(points: Array<Point>) {
    runOnMain {
      cancelScheduledFrame()
      multiDataSetMode = false
      resetDataRenderer()
      val validPoints = points.filter { validPoint(it) }
      val entries = validPoints.map { Entry(it.x.toFloat(), it.y.toFloat()) }.toMutableList()
      val set = LineDataSet(entries, "Dataset")
      configureSingleDataSet(set)
      this.singleDataSet = set

      val data = LineData(set)
      chartView.data = data

      config?.visibleRangeX?.let {
        if (it > 0) chartView.setVisibleXRangeMaximum(it.toFloat())
      }

      if (validPoints.isNotEmpty() && config?.autoScroll != false) {
        chartView.moveViewToX(validPoints.last().x.toFloat())
      }

      chartView.notifyDataSetChanged()
      chartView.postInvalidate()
      animateInitialData()
    }
  }

  override fun setChartDataSets(dataSets: Array<LineChartDataSet>) {
    runOnMain {
      cancelScheduledFrame()
      val enteringMultiDataSetMode = !multiDataSetMode
      multiDataSetMode = true
      if (enteringMultiDataSetMode) chartView.fitScreen()
      resetDataRenderer()
      val nativeSets = mutableListOf<LineDataSet>()
      for (ds in dataSets) {
        val entries = ds.values.filter { validPoint(it) }.map { Entry(it.x.toFloat(), it.y.toFloat()) }.toMutableList()
        val set = LineDataSet(entries, ds.label ?: "")
        configureCustomDataSet(set, ds.config)
        nativeSets.add(set)
      }

      val data = LineData(nativeSets.toList())
      singleDataSet = null
      chartView.highlightValues(null)
      chartView.data = data

      config?.visibleRangeX?.let {
        if (it > 0) chartView.setVisibleXRangeMaximum(it.toFloat())
      }

      chartView.notifyDataSetChanged()
      chartView.postInvalidate()
      animateInitialData()
    }
  }

  private fun animateInitialData() {
    val duration = config?.animationDurationX
    if (duration != null && duration.isFinite() && duration > 0) chartView.animateX(duration.toInt())
  }

  override fun clearData() {
    runOnMain {
      cancelScheduledFrame()
      multiDataSetMode = false
      resetDataRenderer()
      singleDataSet?.clear()
      singleDataSet = null
      chartView.highlightValues(null)
      chartView.data = null
      chartView.notifyDataSetChanged()
      chartView.postInvalidate()
    }
  }

  override fun setVisibleXRangeMaximum(maximum: Double) {
    runOnMain {
      chartView.setVisibleXRangeMaximum(maximum.toFloat())
    }
  }

  override fun moveViewToX(x: Double) {
    runOnMain {
      chartView.moveViewToX(x.toFloat())
    }
  }

  override fun fitScreen() {
    runOnMain {
      chartView.fitScreen()
    }
  }

  // MARK: - Config Application

  private fun applyConfig() {
    val cfg = config
    chartView.setBackgroundColor(parseColor(cfg?.backgroundColor, Color.TRANSPARENT))
    chartView.isDragEnabled = cfg?.dragEnabled ?: true
    chartView.setScaleEnabled(cfg?.scaleEnabled ?: true)
    chartView.isScaleXEnabled = cfg?.scaleXEnabled ?: (cfg?.scaleEnabled ?: true)
    chartView.isScaleYEnabled = cfg?.scaleYEnabled ?: (cfg?.scaleEnabled ?: true)
    chartView.setPinchZoom(cfg?.pinchZoom ?: true)
    chartView.legend.isEnabled = cfg?.legendEnabled ?: false
    chartView.description.text = cfg?.descriptionText ?: ""
    chartView.description.isEnabled = !cfg?.descriptionText.isNullOrEmpty()
    chartView.setNoDataText(cfg?.noDataText ?: "No chart data available")
    chartView.setMaxVisibleValueCount(cfg?.maxVisibleValueCount?.takeIf { it.isFinite() && it >= 0 }?.toInt() ?: 100)
    val eo = cfg?.extraOffsets
    chartView.setExtraOffsets((eo?.left ?: 0.0).toFloat(), (eo?.top ?: 0.0).toFloat(),
      (eo?.right ?: 0.0).toFloat(), (eo?.bottom ?: 0.0).toFloat())

    val xAxis = chartView.xAxis
    val x = cfg?.xAxis
    xAxis.setDrawGridLines(x?.drawGridLines ?: cfg?.drawGridLines ?: true)
    xAxis.setDrawAxisLine(x?.drawAxisLine ?: cfg?.drawAxisLines ?: true)
    xAxis.setDrawLabels(x?.drawLabels ?: cfg?.drawLabels ?: true)
    xAxis.gridColor = parseColor(x?.gridColor ?: cfg?.gridColor, Color.GRAY)
    xAxis.axisLineColor = parseColor(x?.axisLineColor, Color.GRAY)
    xAxis.textColor = parseColor(x?.textColor ?: cfg?.textColor, Color.BLACK)
    xAxis.textSize = (x?.textSize ?: cfg?.textSize ?: 10.0).toFloat()
    val xFormatter = x?.valueFormatter ?: cfg?.xAxisValueFormatter
    xAxis.valueFormatter = if (!xFormatter.isNullOrEmpty()) IndexAxisValueFormatter(xFormatter) else null
    xAxis.granularity = (x?.granularity ?: 1.0).toFloat()
    xAxis.isGranularityEnabled = x?.granularityEnabled ?: (!xFormatter.isNullOrEmpty() || x?.granularity != null)
    xAxis.position = when ((x?.position ?: cfg?.xAxisPosition)?.uppercase()) {
      "BOTTOM" -> XAxis.XAxisPosition.BOTTOM
      "BOTH_SIDED" -> XAxis.XAxisPosition.BOTH_SIDED
      "TOP_INSIDE" -> XAxis.XAxisPosition.TOP_INSIDE
      "BOTTOM_INSIDE" -> XAxis.XAxisPosition.BOTTOM_INSIDE
      else -> XAxis.XAxisPosition.TOP
    }

    val leftAxis = chartView.axisLeft
    val y = cfg?.yAxis
    leftAxis.setDrawGridLines(y?.drawGridLines ?: cfg?.drawGridLines ?: true)
    leftAxis.setDrawAxisLine(y?.drawAxisLine ?: cfg?.drawAxisLines ?: true)
    leftAxis.setDrawLabels(y?.drawLabels ?: true)
    leftAxis.gridColor = parseColor(y?.gridColor ?: cfg?.gridColor, Color.GRAY)
    leftAxis.axisLineColor = parseColor(y?.axisLineColor, Color.GRAY)
    leftAxis.textColor = parseColor(y?.textColor ?: cfg?.textColor, Color.BLACK)
    leftAxis.textSize = (y?.textSize ?: cfg?.textSize ?: 10.0).toFloat()
    leftAxis.granularity = (y?.granularity ?: 1.0).toFloat()
    leftAxis.isGranularityEnabled = y?.granularityEnabled ?: (y?.granularity != null)
    if (y?.axisMinimum != null && y.axisMinimum.isFinite()) leftAxis.axisMinimum = y.axisMinimum.toFloat()
    else leftAxis.resetAxisMinimum()
    val pattern = y?.valueFormatter
    leftAxis.valueFormatter = if (!pattern.isNullOrEmpty()) {
      try {
        val formatter = DecimalFormat(pattern)
        object : ValueFormatter() {
          override fun getFormattedValue(value: Float): String = formatter.format(value.toDouble())
        }
      } catch (_: IllegalArgumentException) { null }
    } else null

    cfg?.visibleRangeX?.takeIf { it.isFinite() && it > 0 }?.let {
      chartView.setVisibleXRangeMaximum(it.toFloat())
    }
    singleDataSet?.let { configureSingleDataSet(it) }
    chartView.notifyDataSetChanged()
    chartView.postInvalidate()
  }

  // MARK: - OnChartValueSelectedListener

  override fun onValueSelected(e: Entry?, h: Highlight?) {
    if (e != null && h != null) {
      val pixelX = PixelUtil.toDIPFromPixel(h.xPx).toDouble()
      val pixelY = PixelUtil.toDIPFromPixel(h.yPx).toDouble()
      val selected = SelectedPoint(
        x = e.x.toDouble(),
        y = e.y.toDouble(),
        pixelX = pixelX,
        pixelY = pixelY,
        dataIndex = chartView.data?.getDataSetByIndex(h.dataSetIndex)?.getEntryIndex(e)?.toDouble(),
        dataSetIndex = h.dataSetIndex.toDouble()
      )
      onSelectPoint?.invoke(selected)
    }
  }

  override fun onNothingSelected() {}

  // MARK: - Color Helper

  private fun parseColor(colorStr: String?, defaultColor: Int): Int {
    if (colorStr.isNullOrEmpty()) return defaultColor
    return try {
      Color.parseColor(colorStr)
    } catch (_: Exception) {
      defaultColor
    }
  }
}
