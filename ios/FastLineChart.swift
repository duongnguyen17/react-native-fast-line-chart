import UIKit
import DGCharts
import NitroModules

// MARK: - Value Formatters

private class IndexAxisValueFormatter: NSObject, AxisValueFormatter {
  private let values: [String]

  init(values: [String]) {
    self.values = values
    super.init()
  }

  func stringForValue(_ value: Double, axis: AxisBase?) -> String {
    guard value.isFinite, value >= -0.5, value < Double(values.count) else { return "" }
    let index = Int(round(value))
    guard index >= 0 && index < values.count else { return "" }
    return values[index]
  }
}

private class DataSetValueFormatter: NSObject, ValueFormatter {
  private let processedLabels: [String]

  init(labels: [String], hideConsecutiveDuplicates: Bool) {
    if hideConsecutiveDuplicates {
      var result: [String] = []
      result.reserveCapacity(labels.count)
      for (i, label) in labels.enumerated() {
        if !label.isEmpty && i > 0 && label == labels[i - 1] {
          result.append("")
        } else {
          result.append(label)
        }
      }
      self.processedLabels = result
    } else {
      self.processedLabels = labels
    }
    super.init()
  }

  func stringForValue(_ value: Double, entry: ChartDataEntry, dataSetIndex: Int, viewPortHandler: ViewPortHandler?) -> String {
    guard entry.x.isFinite, entry.x >= -0.5, entry.x < Double(processedLabels.count) else { return "" }
    let index = Int(round(entry.x))
    guard index >= 0 && index < processedLabels.count else { return "" }
    return processedLabels[index]
  }
}

// MARK: - Proxies

private class DisplayLinkProxy: NSObject {
  weak var target: HybridFastLineChart?

  init(target: HybridFastLineChart) {
    self.target = target
  }

  @objc func onTick() {
    target?.handleDisplayLinkTick()
  }
}

private class ChartDelegateProxy: NSObject, ChartViewDelegate {
  weak var owner: HybridFastLineChart?

  init(owner: HybridFastLineChart) {
    self.owner = owner
  }

  func chartValueSelected(_ chartView: ChartViewBase, entry: ChartDataEntry, highlight: Highlight) {
    let pixelX = highlight.xPx
    let pixelY = highlight.yPx
    let sets = chartView.data?.dataSets ?? []
    let setIndex = highlight.dataSetIndex
    let index = sets.indices.contains(setIndex) ? sets[setIndex].entryIndex(entry: entry) : -1
    let point = SelectedPoint(
      x: entry.x,
      y: entry.y,
      pixelX: pixelX,
      pixelY: pixelY,
      dataIndex: index >= 0 ? Double(index) : nil,
      dataSetIndex: Double(highlight.dataSetIndex)
    )
    owner?.onSelectPoint?(point)
  }

  func chartValueNothingSelected(_ chartView: ChartViewBase) {
    // optional deselect handling
  }
}

// MARK: - Main Hybrid View

class HybridFastLineChart: HybridFastLineChartSpec {

  // UIView backing the HybridView
  var view: UIView {
    return chartView
  }

  private lazy var delegateProxy = ChartDelegateProxy(owner: self)
  private lazy var displayLinkProxy = DisplayLinkProxy(target: self)

  private lazy var chartView: LineChartView = {
    let chart = LineChartView()
    chart.delegate = self.delegateProxy
    chart.chartDescription.enabled = false
    chart.legend.enabled = false
    chart.rightAxis.enabled = false
    chart.dragEnabled = true
    chart.setScaleEnabled(true)
    chart.pinchZoomEnabled = true
    chart.drawGridBackgroundEnabled = false
    chart.noDataText = "No chart data available"
    return chart
  }()

  private var singleDataSet: DGCharts.LineChartDataSet?
  private var displayLink: CADisplayLink?
  private var needsRedraw: Bool = false
  private var lastAppendedX: Double = 0.0

  // Props
  var config: LineChartConfig? {
    didSet {
      DispatchQueue.main.async { [weak self] in
        self?.applyConfig()
      }
    }
  }

  var initialPoints: [Point]? {
    didSet {
      DispatchQueue.main.async { [weak self] in
        if let points = self?.initialPoints {
          try? self?.setDataPoints(points: points)
        }
      }
    }
  }

  var dataSets: [LineChartDataSet]? {
    didSet {
      DispatchQueue.main.async { [weak self] in
        if let sets = self?.dataSets {
          try? self?.setChartDataSets(dataSets: sets)
        }
      }
    }
  }

  var onSelectPoint: ((_ point: SelectedPoint) -> Void)?

  override init() {
    super.init()
    setupDisplayLink()
  }

  deinit {
    displayLink?.invalidate()
    displayLink = nil
  }

  // MARK: - VSync Scheduler

  private func setupDisplayLink() {
    let link = CADisplayLink(target: displayLinkProxy, selector: #selector(DisplayLinkProxy.onTick))
    link.isPaused = true
    link.add(to: .main, forMode: .common)
    self.displayLink = link
  }

  private func scheduleRedraw(lastX: Double) {
    lastAppendedX = lastX
    needsRedraw = true
    if displayLink?.isPaused == true {
      displayLink?.isPaused = false
    }
  }

  fileprivate func handleDisplayLinkTick() {
    guard needsRedraw else {
      displayLink?.isPaused = true
      return
    }

    needsRedraw = false
    displayLink?.isPaused = true

    // A filled cubic path needs two points. Draw the first point linearly, then
    // restore the requested mode once a second point arrives.
    if let set = singleDataSet {
      applySingleMode(set)
    }

    guard let data = chartView.data else { return }
    data.notifyDataChanged()
    chartView.notifyDataSetChanged()

    if let visibleX = config?.visibleRangeX, visibleX > 0, chartView.xAxis.axisRange > visibleX {
      chartView.setVisibleXRangeMaximum(visibleX)
    }

    if config?.autoScroll ?? true {
      chartView.moveViewToX(lastAppendedX)
    }

    chartView.setNeedsDisplay()
  }

  // MARK: - Data Management (Single & Multi-dataset)

  private func getOrCreateSingleDataSet() -> DGCharts.LineChartDataSet {
    if let existing = singleDataSet, chartView.data != nil {
      return existing
    }

    let set = singleDataSet ?? DGCharts.LineChartDataSet(entries: [], label: "Dataset")
    configureSingleDataSet(set)
    self.singleDataSet = set

    let data = DGCharts.LineChartData(dataSet: set)
    chartView.data = data

    return set
  }

  private func configureSingleDataSet(_ set: DGCharts.LineChartDataSet) {
    let lineColor = config?.lineColor.flatMap { hexToUIColor($0) } ?? UIColor.systemBlue
    set.colors = [lineColor]
    set.lineWidth = CGFloat(config?.lineWidth ?? 2.0)

    let drawCircles = config?.drawCircles ?? false
    set.drawCirclesEnabled = drawCircles
    if drawCircles {
      let circleColor = config?.circleColor.flatMap { hexToUIColor($0) } ?? lineColor
      set.circleColors = [circleColor]
      set.circleRadius = CGFloat(config?.circleRadius ?? 3.5)
    }

    // Circle Hole
    let drawHole = config?.drawCircleHole ?? false
    set.drawCircleHoleEnabled = drawHole
    if drawHole {
      set.circleHoleRadius = CGFloat(config?.circleHoleRadius ?? 2.0)
      if let holeColor = config?.circleHoleColor.flatMap({ hexToUIColor($0) }) {
        set.circleHoleColor = holeColor
      }
    }

    set.drawValuesEnabled = config?.drawValues ?? false
    if let valueColor = config?.valueTextColor.flatMap({ hexToUIColor($0) }) {
      set.valueTextColor = valueColor
    }
    if let valueSize = config?.valueTextSize {
      set.valueFont = UIFont.systemFont(ofSize: CGFloat(valueSize))
    }

    if let formatter = config?.valueFormatter, !formatter.isEmpty {
      let hideDuplicates = config?.hideConsecutiveDuplicateValues ?? false
      set.valueFormatter = DataSetValueFormatter(labels: formatter, hideConsecutiveDuplicates: hideDuplicates)
    } else {
      set.valueFormatter = DefaultValueFormatter()
    }

    applySingleMode(set)

    // Fill
    let drawFilled = config?.drawFilled ?? false
    set.drawFilledEnabled = drawFilled
    if drawFilled {
      let fillColor = config?.fillColor.flatMap { hexToUIColor($0) } ?? lineColor
      set.fillColor = fillColor
      set.fillAlpha = CGFloat(config?.fillAlpha ?? 0.25)
    }

    set.highlightEnabled = config?.highlightEnabled ?? true
  }

  private func applySingleMode(_ set: DGCharts.LineChartDataSet) {
    switch set.entryCount < 2 ? "LINEAR" : config?.mode?.uppercased() {
    case "CUBIC_BEZIER":
      set.mode = .cubicBezier
    case "STEPPED":
      set.mode = .stepped
    case "HORIZONTAL_BEZIER":
      set.mode = .horizontalBezier
    default:
      set.mode = .linear
    }

  }

  private func configureCustomDataSet(_ set: DGCharts.LineChartDataSet, config cfg: LineDataSetConfig?) {
    let lineColor = cfg?.color.flatMap { hexToUIColor($0) } ?? UIColor.systemBlue
    set.colors = [lineColor]
    set.lineWidth = CGFloat(cfg?.lineWidth ?? 2.0)

    let drawCircles = cfg?.drawCircles ?? false
    set.drawCirclesEnabled = drawCircles
    if drawCircles {
      let circleColor = cfg?.circleColor.flatMap { hexToUIColor($0) } ?? lineColor
      set.circleColors = [circleColor]
      set.circleRadius = CGFloat(cfg?.circleRadius ?? 3.5)
    }

    // Circle Hole
    let drawHole = cfg?.drawCircleHole ?? false
    set.drawCircleHoleEnabled = drawHole
    if drawHole {
      set.circleHoleRadius = CGFloat(cfg?.circleHoleRadius ?? 2.0)
      if let holeColor = cfg?.circleHoleColor.flatMap({ hexToUIColor($0) }) {
        set.circleHoleColor = holeColor
      }
    }

    set.drawValuesEnabled = cfg?.drawValues ?? false
    if let valueColor = cfg?.valueTextColor.flatMap({ hexToUIColor($0) }) {
      set.valueTextColor = valueColor
    }
    if let valueSize = cfg?.valueTextSize {
      set.valueFont = UIFont.systemFont(ofSize: CGFloat(valueSize))
    }

    // Value Formatter & Consecutive Duplicate Suppression
    if let formatter = cfg?.valueFormatter, !formatter.isEmpty {
      let hideDuplicates = cfg?.hideConsecutiveDuplicateValues ?? false
      set.valueFormatter = DataSetValueFormatter(labels: formatter, hideConsecutiveDuplicates: hideDuplicates)
    }

    switch set.entryCount < 2 ? "LINEAR" : cfg?.mode?.uppercased() {
    case "CUBIC_BEZIER":
      set.mode = .cubicBezier
    case "STEPPED":
      set.mode = .stepped
    case "HORIZONTAL_BEZIER":
      set.mode = .horizontalBezier
    default:
      set.mode = .linear
    }

    let drawFilled = cfg?.drawFilled ?? false
    set.drawFilledEnabled = drawFilled
    if drawFilled {
      let fillColor = cfg?.fillColor.flatMap { hexToUIColor($0) } ?? lineColor
      set.fillColor = fillColor
      set.fillAlpha = CGFloat(cfg?.fillAlpha ?? 0.25)
    }

    set.highlightEnabled = cfg?.highlightEnabled ?? true
  }

  // MARK: - Hybrid Methods

  func appendPoint(x: Double, y: Double, maxPoints: Double?) throws {
    guard x.isFinite, y.isFinite else { return }
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      guard self.singleDataSet != nil || self.chartView.data == nil else { return }
      let set = self.getOrCreateSingleDataSet()

      let entry = ChartDataEntry(x: x, y: y)
      _ = set.append(entry)

      if let max = maxPoints, max.isFinite, max >= 1, max < Double(Int.max), set.entryCount > Int(max) {
        let excess = set.entryCount - Int(max)
        set.removeFirst(excess)
      }

      self.scheduleRedraw(lastX: x)
    }
  }

  func appendPointsBatch(points: [Point], maxPoints: Double?) throws {
    let points = points.filter { $0.x.isFinite && $0.y.isFinite }
    guard !points.isEmpty else { return }

    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      guard self.singleDataSet != nil || self.chartView.data == nil else { return }
      let set = self.getOrCreateSingleDataSet()

      var lastX = points.last!.x
      for pt in points {
        let entry = ChartDataEntry(x: pt.x, y: pt.y)
        _ = set.append(entry)
        lastX = pt.x
      }

      if let max = maxPoints, max.isFinite, max >= 1, max < Double(Int.max), set.entryCount > Int(max) {
        let excess = set.entryCount - Int(max)
        set.removeFirst(excess)
      }

      self.scheduleRedraw(lastX: lastX)
    }
  }

  func setDataPoints(points: [Point]) throws {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      self.needsRedraw = false
      self.displayLink?.isPaused = true
      let points = points.filter { $0.x.isFinite && $0.y.isFinite }
      let entries = points.map { ChartDataEntry(x: $0.x, y: $0.y) }
      let set = DGCharts.LineChartDataSet(entries: entries, label: "Dataset")
      self.configureSingleDataSet(set)
      self.singleDataSet = set

      let data = DGCharts.LineChartData(dataSet: set)
      self.chartView.data = data

      if let visibleX = self.config?.visibleRangeX, visibleX > 0 {
        self.chartView.setVisibleXRangeMaximum(visibleX)
      }

      if let last = points.last, (self.config?.autoScroll ?? true) {
        self.chartView.moveViewToX(last.x)
      }

      self.chartView.notifyDataSetChanged()
      self.chartView.setNeedsDisplay()
      self.animateIfRequested()
    }
  }

  func setChartDataSets(dataSets: [LineChartDataSet]) throws {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      let wasSingleDataSet = self.singleDataSet != nil
      self.needsRedraw = false
      self.displayLink?.isPaused = true

      var nativeSets: [DGCharts.LineChartDataSet] = []
      nativeSets.reserveCapacity(dataSets.count)

      for ds in dataSets {
        let entries = ds.values.filter { $0.x.isFinite && $0.y.isFinite }.map { ChartDataEntry(x: $0.x, y: $0.y) }
        let set = DGCharts.LineChartDataSet(entries: entries, label: ds.label ?? "")
        self.configureCustomDataSet(set, config: ds.config)
        nativeSets.append(set)
      }

      let data = DGCharts.LineChartData(dataSets: nativeSets)
      self.singleDataSet = nil
      self.chartView.data = data
      self.chartView.highlightValues(nil)
      if wasSingleDataSet { self.chartView.fitScreen() }

      if let visibleX = self.config?.visibleRangeX, visibleX > 0 {
        self.chartView.setVisibleXRangeMaximum(visibleX)
      }

      self.chartView.notifyDataSetChanged()
      self.chartView.setNeedsDisplay()
      self.animateIfRequested()
    }
  }

  func clearData() throws {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      self.displayLink?.isPaused = true
      self.needsRedraw = false
      self.singleDataSet?.clear()
      self.singleDataSet = nil
      self.chartView.highlightValues(nil)
      self.chartView.data = nil
      self.chartView.notifyDataSetChanged()
      self.chartView.setNeedsDisplay()
    }
  }

  func setVisibleXRangeMaximum(maximum: Double) throws {
    DispatchQueue.main.async { [weak self] in
      self?.chartView.setVisibleXRangeMaximum(maximum)
    }
  }

  func moveViewToX(x: Double) throws {
    DispatchQueue.main.async { [weak self] in
      self?.chartView.moveViewToX(x)
    }
  }

  func fitScreen() throws {
    DispatchQueue.main.async { [weak self] in
      self?.chartView.fitScreen()
    }
  }

  // MARK: - Config Application

  private func animateIfRequested() {
    if let duration = config?.animationDurationX, duration.isFinite, duration > 0 {
      chartView.animate(xAxisDuration: duration / 1000)
    }
  }

  private func applyConfig() {
    let cfg = config
    chartView.backgroundColor = cfg?.backgroundColor.map { hexToUIColor($0) } ?? .clear
    chartView.dragEnabled = cfg?.dragEnabled ?? true
    chartView.setScaleEnabled(cfg?.scaleEnabled ?? true)
    if let sx = cfg?.scaleXEnabled { chartView.scaleXEnabled = sx }
    if let sy = cfg?.scaleYEnabled { chartView.scaleYEnabled = sy }
    chartView.pinchZoomEnabled = cfg?.pinchZoom ?? true
    chartView.legend.enabled = cfg?.legendEnabled ?? false
    chartView.chartDescription.text = cfg?.descriptionText ?? ""
    chartView.chartDescription.enabled = !(cfg?.descriptionText ?? "").isEmpty
    chartView.noDataText = cfg?.noDataText ?? "No chart data available"
    if let count = cfg?.maxVisibleValueCount, count.isFinite, count >= 0, count < Double(Int.max) {
      chartView.maxVisibleCount = Int(count)
    } else {
      chartView.maxVisibleCount = 100
    }
    let offsets = cfg?.extraOffsets
    chartView.setExtraOffsets(left: CGFloat(offsets?.left ?? 0), top: CGFloat(offsets?.top ?? 0),
                              right: CGFloat(offsets?.right ?? 0), bottom: CGFloat(offsets?.bottom ?? 0))

    let x = chartView.xAxis
    let y = chartView.leftAxis
    let xc = cfg?.xAxis
    let yc = cfg?.yAxis
    x.drawGridLinesEnabled = xc?.drawGridLines ?? cfg?.drawGridLines ?? true
    y.drawGridLinesEnabled = yc?.drawGridLines ?? cfg?.drawGridLines ?? true
    x.drawAxisLineEnabled = xc?.drawAxisLine ?? cfg?.drawAxisLines ?? true
    y.drawAxisLineEnabled = yc?.drawAxisLine ?? cfg?.drawAxisLines ?? true
    x.drawLabelsEnabled = xc?.drawLabels ?? cfg?.drawLabels ?? true
    y.drawLabelsEnabled = yc?.drawLabels ?? true
    x.gridColor = (xc?.gridColor ?? cfg?.gridColor).map { hexToUIColor($0) } ?? .gray
    y.gridColor = (yc?.gridColor ?? cfg?.gridColor).map { hexToUIColor($0) } ?? .gray
    x.axisLineColor = xc?.axisLineColor.map { hexToUIColor($0) } ?? .gray
    y.axisLineColor = yc?.axisLineColor.map { hexToUIColor($0) } ?? .gray
    x.labelTextColor = (xc?.textColor ?? cfg?.textColor).map { hexToUIColor($0) } ?? .black
    y.labelTextColor = (yc?.textColor ?? cfg?.textColor).map { hexToUIColor($0) } ?? .black
    x.labelFont = .systemFont(ofSize: CGFloat(xc?.textSize ?? cfg?.textSize ?? 10))
    y.labelFont = .systemFont(ofSize: CGFloat(yc?.textSize ?? cfg?.textSize ?? 10))
    let labels = xc?.valueFormatter ?? cfg?.xAxisValueFormatter
    x.valueFormatter = labels.flatMap { $0.isEmpty ? nil : IndexAxisValueFormatter(values: $0) }
    x.granularity = xc?.granularity ?? 1
    x.granularityEnabled = xc?.granularityEnabled ?? (!(labels?.isEmpty ?? true) || xc?.granularity != nil)
    y.granularity = yc?.granularity ?? 1
    y.granularityEnabled = yc?.granularityEnabled ?? (yc?.granularity != nil)
    if let minimum = yc?.axisMinimum, minimum.isFinite { y.axisMinimum = minimum }
    else { y.resetCustomAxisMin() }
    if let pattern = yc?.valueFormatter, !pattern.isEmpty {
      let formatter = NumberFormatter()
      formatter.locale = Locale(identifier: "en_US_POSIX")
      formatter.positiveFormat = pattern
      y.valueFormatter = DefaultAxisValueFormatter(formatter: formatter)
    } else {
      y.valueFormatter = nil
    }
    switch (xc?.position ?? cfg?.xAxisPosition)?.uppercased() {
    case "BOTTOM": x.labelPosition = .bottom
    case "BOTH_SIDED": x.labelPosition = .bothSided
    case "TOP_INSIDE": x.labelPosition = .topInside
    case "BOTTOM_INSIDE": x.labelPosition = .bottomInside
    default: x.labelPosition = .top
    }
    if let visibleX = cfg?.visibleRangeX, visibleX.isFinite, visibleX > 0 {
      chartView.setVisibleXRangeMaximum(visibleX)
    }
    if let set = singleDataSet { configureSingleDataSet(set) }
    chartView.notifyDataSetChanged()
    chartView.setNeedsDisplay()
  }

  // MARK: - Color Helper

  private func hexToUIColor(_ hex: String) -> UIColor {
    var cString = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    if cString.hasPrefix("#") {
      cString.remove(at: cString.startIndex)
    }

    var rgbValue: UInt64 = 0
    Scanner(string: cString).scanHexInt64(&rgbValue)

    if cString.count == 8 {
      let a = CGFloat((rgbValue & 0xFF000000) >> 24) / 255.0
      let r = CGFloat((rgbValue & 0x00FF0000) >> 16) / 255.0
      let g = CGFloat((rgbValue & 0x0000FF00) >> 8) / 255.0
      let b = CGFloat(rgbValue & 0x000000FF) / 255.0
      return UIColor(red: r, green: g, blue: b, alpha: a)
    } else if cString.count == 6 {
      let r = CGFloat((rgbValue & 0xFF0000) >> 16) / 255.0
      let g = CGFloat((rgbValue & 0x00FF00) >> 8) / 255.0
      let b = CGFloat(rgbValue & 0x0000FF) / 255.0
      return UIColor(red: r, green: g, blue: b, alpha: 1.0)
    }

    return UIColor.black
  }
}
