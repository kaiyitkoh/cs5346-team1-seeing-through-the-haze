/**
 * Pattern Chart — Story Section 1
 * Vertical bar chart: haze days per year 2014-2024 (11 bars)
 * Steps:
 *   0: all bars appear in #A8B4BA
 *   1: 2015 highlighted in #C0392B with "46 days" annotation
 *   2: SW Monsoon band annotated (Jun-Sep contextual band)
 *
 * Factory pattern: createPatternChart() returns { init, update, destroy }
 */

import * as d3 from 'd3'
import { interpolatePath } from 'd3-interpolate-path'
import { SECTION_CHARTS } from '../../scroll.js'

export function createPatternChart() {
  let _container = null
  let _svg = null
  let _data = null
  let _dailyPSI = null
  let _currentStep = -1
  let _tooltip = null
  let _initAnimDone = false
  let _xScaleBand = null
  let _yScaleLinear = null
  let _dailyXScale = null
  let _dailyYScale = null
  let _innerHeight = 0
  let _innerWidth = 0
  let _yearPSIStats = null // { year → { maxPSI, minPSI } } for morph targets
  let _yearLinePaths = null // Map(year → actual daily line path string)
  let _yearFlatPaths = null // Map(year → flat line path string at bar-top y)

  const margin = { top: 40, right: 20, bottom: 50, left: 60 }
  const HEIGHT = 480

  function init(container, data) {
    _container = container
    _data = data.haze_days_annual
    _dailyPSI = data.day_predictions || []
    // Compute 2015 peak PSI from day_predictions data (data-driven, not hardcoded)
    const psi2015entries = _dailyPSI.filter((d) => d.date && d.date.startsWith('2015'))
    const peak2015 = psi2015entries.reduce((max, d) => Math.max(max, d.actual_psi || 0), 0)
    const peak2015Label = peak2015 > 0 ? Math.round(peak2015) : 322

    // Clear any previous render
    d3.select(container).selectAll('*').remove()

    const width = container.getBoundingClientRect().width || 480
    const innerWidth = width - margin.left - margin.right
    const innerHeight = HEIGHT - margin.top - margin.bottom
    _innerHeight = innerHeight
    _innerWidth = innerWidth

    // SVG
    const svgEl = d3
      .select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', HEIGHT)
      .attr('viewBox', `0 0 ${width} ${HEIGHT}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')

    _svg = svgEl.node()

    // Chart title
    svgEl
      .append('text')
      .attr('class', 'chart-title')
      .attr('x', margin.left)
      .attr('y', 24)
      .attr('fill', '#1A1A1A')
      .attr('font-size', '18px')
      .attr('font-weight', '600')
      .attr('font-family', 'Public Sans, sans-serif')
      .text('Haze Days per Year, 2014\u20132024')

    // Scales
    const years = _data.map((d) => d.year)
    const xScale = d3
      .scaleBand()
      .domain(years)
      .range([0, innerWidth])
      .padding(0.2)
    _xScaleBand = xScale

    const yScale = d3
      .scaleLinear()
      .domain([0, 55])
      .range([innerHeight, 0])
    _yScaleLinear = yScale

    // Chart group
    const g = svgEl
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Horizontal gridlines
    const yTicks = yScale.ticks(5)
    g.append('g')
      .attr('class', 'gridlines')
      .selectAll('line')
      .data(yTicks)
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#D8D4CE')
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', 1)

    // Average dotted line at y=8
    g.append('line')
      .attr('class', 'avg-line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(7))
      .attr('y2', yScale(7))
      .attr('stroke', '#5A5A5A')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4')
      .attr('opacity', 0.6)

    g.append('text')
      .attr('class', 'avg-label')
      .attr('x', innerWidth - 4)
      .attr('y', yScale(7) - 6)
      .attr('text-anchor', 'end')
      .attr('fill', '#5A5A5A')
      .attr('font-size', '11px')
      .attr('font-style', 'italic')
      .attr('font-family', 'Public Sans, sans-serif')
      .attr('opacity', 0.6)
      .text('Avg: 7 days/year')

    // Monsoon annotation — text annotation at top-right (drawn before bars)
    const monsoonAnnotation = g.append('g')
      .attr('class', 'monsoon-annotation')
      .attr('transform', `translate(${innerWidth - 10}, 10)`)

    monsoonAnnotation.append('text')
      .attr('class', 'monsoon-line-1')
      .attr('x', 0)
      .attr('y', 0)
      .attr('text-anchor', 'end')
      .attr('fill', '#5A5A5A')
      .attr('font-size', '13px')
      .attr('font-style', 'italic')
      .attr('font-family', 'Public Sans, sans-serif')
      .attr('opacity', 0)
      .text('Nearly all haze days occur')

    monsoonAnnotation.append('text')
      .attr('class', 'monsoon-line-2')
      .attr('x', 0)
      .attr('y', 18)
      .attr('text-anchor', 'end')
      .attr('fill', '#5A5A5A')
      .attr('font-size', '13px')
      .attr('font-style', 'italic')
      .attr('font-family', 'Public Sans, sans-serif')
      .attr('opacity', 0)
      .text('during SW Monsoon (Jun\u2013Sep)')

    // X axis
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat((d) => d))
      .call((grp) => {
        grp.select('.domain').attr('stroke', '#D8D4CE')
        grp.selectAll('.tick line').remove()
        grp.selectAll('.tick text')
          .attr('fill', '#5A5A5A')
          .attr('font-size', '12px')
          .attr('font-family', 'Public Sans, sans-serif')
      })

    // X axis label
    g.append('text')
      .attr('class', 'x-label')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 44)
      .attr('text-anchor', 'middle')
      .attr('fill', '#5A5A5A')
      .attr('font-size', '13px')
      .attr('font-family', 'Public Sans, sans-serif')
      .text('Year')

    // Y axis
    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(yScale).ticks(5))
      .call((grp) => {
        grp.select('.domain').attr('stroke', '#D8D4CE')
        grp.selectAll('.tick line').remove()
        grp.selectAll('.tick text')
          .attr('fill', '#5A5A5A')
          .attr('font-size', '12px')
          .attr('font-family', 'Public Sans, sans-serif')
      })

    // Y axis label
    g.append('text')
      .attr('class', 'y-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -48)
      .attr('text-anchor', 'middle')
      .attr('fill', '#5A5A5A')
      .attr('font-size', '13px')
      .attr('font-family', 'Public Sans, sans-serif')
      .text('Haze Days')

    // Bars — staggered reveal animation
    const barsG = g.append('g').attr('class', 'bars')

    barsG
      .selectAll('rect')
      .data(_data)
      .join('rect')
      .attr('class', (d) => `bar bar-${d.year}`)
      .attr('x', 0) // start from left
      .attr('y', innerHeight) // start from bottom
      .attr('width', xScale.bandwidth())
      .attr('height', 0)
      .attr('fill', '#A8B4BA')
      .attr('opacity', 0)

    // Data labels on top of bars
    barsG
      .selectAll('text.bar-label')
      .data(_data)
      .join('text')
      .attr('class', 'bar-label')
      .attr('x', xScale.bandwidth() / 2) // start from left, centered on bar
      .attr('y', innerHeight - 4) // start from bottom
      .attr('text-anchor', 'middle')
      .attr('fill', '#8A8A8A')
      .attr('font-size', '10px')
      .attr('font-family', 'Public Sans, sans-serif')
      .attr('opacity', 0)
      .text((d) => d.haze_days)

    // 2015 annotation (step 1) — hidden initially
    const bar2015 = _data.find((d) => d.year === 2015)
    const x2015 = xScale(2015) + xScale.bandwidth() / 2
    const y2015 = bar2015 ? yScale(bar2015.haze_days) - 10 : margin.top + 8

    g.append('text')
      .attr('class', 'annotation-2015-psi')
      .attr('x', x2015)
      .attr('y', y2015 - 14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#C0392B')
      .attr('font-size', '11px')
      .attr('font-style', 'italic')
      .attr('font-family', 'Public Sans, sans-serif')
      .attr('opacity', 0)
      .text(`Peak PSI: ${peak2015Label}`)

    g.append('text')
      .attr('class', 'annotation-2015')
      .attr('x', x2015)
      .attr('y', y2015)
      .attr('text-anchor', 'middle')
      .attr('fill', '#C0392B')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .attr('font-family', 'Public Sans, sans-serif')
      .attr('opacity', 0)
      .text('46 days')

    // === Step 3: Daily Max PSI line chart overlay (hidden initially) ===
    // This group replaces the bar chart with a line chart of daily Max PSI
    const dailyG = g.append('g').attr('class', 'daily-psi-g').attr('opacity', 0)

    // Scales for daily view
    const dailyXScale = d3
      .scaleTime()
      .domain([new Date('2014-04-01'), new Date('2024-12-31')])
      .range([0, innerWidth])
    _dailyXScale = dailyXScale

    const dailyYScale = d3
      .scaleLinear()
      .domain([0, d3.max(_dailyPSI, (d) => d.actual_psi) * 1.05])
      .range([innerHeight, 0])
    _dailyYScale = dailyYScale

    // Pre-compute per-year PSI stats for bar-to-line morph targets
    const yearGroups = d3.groups(_dailyPSI, (d) => d.date.split('-')[0])
    _yearPSIStats = new Map()
    for (const [yr, entries] of yearGroups) {
      const psiVals = entries.map((d) => d.actual_psi)
      _yearPSIStats.set(+yr, {
        maxPSI: d3.max(psiVals),
        minPSI: d3.min(psiVals),
      })
    }

    // Pre-compute per-year morph paths (flat line → actual daily line)
    _yearLinePaths = new Map()
    _yearFlatPaths = new Map()
    const morphLine = d3.line()
      .x((d) => dailyXScale(new Date(d.date)))
      .y((d) => dailyYScale(d.actual_psi))
      .curve(d3.curveMonotoneX)

    const morphG = g.append('g').attr('class', 'morph-g').attr('opacity', 0)

    for (const yearData of _data) {
      const yr = yearData.year
      const dailyForYear = _dailyPSI
        .filter((d) => d.date.startsWith(String(yr)))
        .sort((a, b) => a.date.localeCompare(b.date))
      if (dailyForYear.length === 0) continue

      // Actual daily line path
      const actualPath = morphLine(dailyForYear)
      _yearLinePaths.set(yr, actualPath)

      // Flat line at bar-top y position, compressed to bar width
      // so the morph starts aligned with the bar, then expands to daily scale
      const flatY = yScale(yearData.haze_days)
      const barLeft = xScale(yr)
      const barW = xScale.bandwidth()
      const yearStart = new Date(`${yr}-01-01`)
      const yearEnd = new Date(`${yr}-12-31`)
      const yearSpan = yearEnd - yearStart
      const flatLine = d3.line()
        .x((d) => {
          const t = (new Date(d.date) - yearStart) / yearSpan
          return barLeft + t * barW
        })
        .y(() => flatY)
        .curve(d3.curveMonotoneX)
      const flatPath = flatLine(dailyForYear)
      _yearFlatPaths.set(yr, flatPath)

      // Create path element starting as flat line
      const m = dailyForYear[0].date.split('-')[1]
      morphG.append('path')
        .datum(yr)
        .attr('class', `morph-line morph-line-${yr}`)
        .attr('d', flatPath)
        .attr('fill', 'none')
        .attr('stroke', yr === 2015 ? '#C0392B' : '#A8B4BA')
        .attr('stroke-width', 1)
    }

    // Daily PSI line — non-monsoon segments in grey
    const nonMonsoonData = _dailyPSI.filter((d) => {
      const m = +d.date.split('-')[1]
      return m < 6 || m > 9
    })
    const monsoonData = _dailyPSI.filter((d) => {
      const m = +d.date.split('-')[1]
      return m >= 6 && m <= 9
    })

    // Grey line for all days
    const dailyLine = d3
      .line()
      .x((d) => dailyXScale(new Date(d.date)))
      .y((d) => dailyYScale(d.actual_psi))
      .curve(d3.curveMonotoneX)

    dailyG
      .append('path')
      .datum(_dailyPSI)
      .attr('fill', 'none')
      .attr('stroke', '#A8B4BA')
      .attr('stroke-width', 0.8)
      .attr('d', dailyLine)

    // Red overlay line for monsoon months only
    // Group monsoon data by year to draw separate segments
    const monsoonByYear = d3.groups(monsoonData, (d) => d.date.split('-')[0])
    monsoonByYear.forEach(([, yearData]) => {
      yearData.sort((a, b) => a.date.localeCompare(b.date))
      dailyG
        .append('path')
        .datum(yearData)
        .attr('fill', 'none')
        .attr('stroke', '#C0392B')
        .attr('stroke-width', 1.5)
        .attr('d', dailyLine)
    })

    // Daily PSI x-axis
    dailyG
      .append('g')
      .attr('class', 'daily-x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(dailyXScale).ticks(6).tickFormat(d3.timeFormat('%Y')))
      .call((grp) => {
        grp.select('.domain').attr('stroke', '#D8D4CE')
        grp.selectAll('.tick line').remove()
        grp.selectAll('.tick text')
          .attr('fill', '#5A5A5A')
          .attr('font-size', '12px')
          .attr('font-family', 'Public Sans, sans-serif')
      })

    // Daily PSI y-axis
    dailyG
      .append('g')
      .attr('class', 'daily-y-axis')
      .call(d3.axisLeft(dailyYScale).ticks(5))
      .call((grp) => {
        grp.select('.domain').attr('stroke', '#D8D4CE')
        grp.selectAll('.tick line').remove()
        grp.selectAll('.tick text')
          .attr('fill', '#5A5A5A')
          .attr('font-size', '12px')
          .attr('font-family', 'Public Sans, sans-serif')
      })

    // Legend for daily view — line swatches + labels, top-right above chart
    const dailyLegend = dailyG.append('g').attr('transform', `translate(${innerWidth - 270}, -24)`)

    // Red line swatch — SW Monsoon
    dailyLegend.append('line').attr('x1', 0).attr('x2', 20).attr('y1', 8).attr('y2', 8)
      .attr('stroke', '#C0392B').attr('stroke-width', 2)
    dailyLegend.append('text').attr('x', 26).attr('y', 12)
      .attr('fill', '#5A5A5A').attr('font-size', '13px').attr('font-family', 'Public Sans, sans-serif')
      .text('SW Monsoon (Jun\u2013Sep)')

    // Grey line swatch — Other months
    dailyLegend.append('line').attr('x1', 170).attr('x2', 190).attr('y1', 8).attr('y2', 8)
      .attr('stroke', '#A8B4BA').attr('stroke-width', 2)
    dailyLegend.append('text').attr('x', 196).attr('y', 12)
      .attr('fill', '#5A5A5A').attr('font-size', '13px').attr('font-family', 'Public Sans, sans-serif')
      .text('Other months')

    // Tooltip element
    _tooltip = d3
      .select(container)
      .append('div')
      .attr('class', 'chart-tooltip')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('opacity', 0)

    // Hover interactions on bars — add after animation completes
    // We attach mouseover/out directly on the rect elements using selection
    // Use a delayed setup to attach after initial bars are created
    const allBars = g.selectAll('.bar')

    allBars
      .on('mouseover', function (event, d) {
        const rect = this.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        const x = rect.left - containerRect.left + rect.width / 2
        const y = rect.top - containerRect.top - 8

        _tooltip
          .style('opacity', 1)
          .style('left', `${x}px`)
          .style('top', `${y}px`)
          .style('transform', 'translate(-50%, -100%)')
          .html(`<strong>${d.year}</strong><br/>${d.haze_days} haze day${d.haze_days === 1 ? '' : 's'}`)
      })
      .on('mouseout', () => {
        _tooltip.style('opacity', 0)
      })

    // Daily PSI hover — crosshair + tooltip for each day
    const dailyCrosshair = dailyG.append('line')
      .attr('class', 'daily-crosshair')
      .attr('y1', 0).attr('y2', innerHeight)
      .attr('stroke', '#5A5A5A').attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '3,3').attr('opacity', 0)
    const dailyDot = dailyG.append('circle')
      .attr('class', 'daily-dot')
      .attr('r', 4).attr('fill', '#C0392B').attr('stroke', '#fff').attr('stroke-width', 1.5)
      .attr('opacity', 0)

    const sortedDaily = [..._dailyPSI].sort((a, b) => a.date.localeCompare(b.date))
    const dailyDates = sortedDaily.map(d => new Date(d.date))
    const bisectDate = d3.bisector(d => d).left

    dailyG.append('rect')
      .attr('class', 'daily-overlay')
      .attr('width', innerWidth).attr('height', innerHeight)
      .attr('fill', 'none').attr('pointer-events', 'all')
      .on('mousemove', function (event) {
        const [mx] = d3.pointer(event, this)
        const hoveredDate = dailyXScale.invert(mx)
        const idx = bisectDate(dailyDates, hoveredDate, 1)
        const d0 = sortedDaily[idx - 1]
        const d1 = sortedDaily[idx]
        if (!d0 && !d1) return
        const closest = !d1 ? d0
          : !d0 ? d1
          : (hoveredDate - new Date(d0.date)) < (new Date(d1.date) - hoveredDate) ? d0 : d1
        const cx = dailyXScale(new Date(closest.date))
        const cy = dailyYScale(closest.actual_psi)
        const month = +closest.date.split('-')[1]
        const isMonsoon = month >= 6 && month <= 9
        const seasonLabel = (month >= 6 && month <= 9) ? 'SW Monsoon'
          : (month === 12 || month <= 3) ? 'NE Monsoon'
          : 'Inter-Monsoon'

        dailyCrosshair.attr('x1', cx).attr('x2', cx).attr('opacity', 1)
        dailyDot.attr('cx', cx).attr('cy', cy).attr('fill', isMonsoon ? '#C0392B' : '#A8B4BA').attr('opacity', 1)

        const containerRect = container.getBoundingClientRect()
        const svgRect = _svg.getBoundingClientRect()
        const tooltipX = svgRect.left - containerRect.left + margin.left + cx
        const tooltipY = svgRect.top - containerRect.top + margin.top + cy - 8

        const dateObj = new Date(closest.date)
        const dateStr = dateObj.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
        _tooltip
          .style('opacity', 1)
          .style('left', `${tooltipX}px`)
          .style('top', `${tooltipY}px`)
          .style('transform', 'translate(-50%, -100%)')
          .html(`<strong>${dateStr}</strong><br/>PSI: ${Math.round(closest.actual_psi)}<br/><span style="color:${isMonsoon ? '#C0392B' : '#5A5A5A'}">${seasonLabel}</span>`)
      })
      .on('mouseout', () => {
        dailyCrosshair.attr('opacity', 0)
        dailyDot.attr('opacity', 0)
        _tooltip.style('opacity', 0)
      })

    _currentStep = -1
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }
  function easeQuadOut(t) { return 1 - (1 - t) * (1 - t) }
  function easeCubicInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }

  // Pre-computed interpolators for morph (created lazily)
  let _morphInterpolators = null

  function _getMorphInterpolators() {
    if (_morphInterpolators) return _morphInterpolators
    _morphInterpolators = new Map()
    for (const [yr, flatPath] of _yearFlatPaths) {
      const targetPath = _yearLinePaths.get(yr)
      if (flatPath && targetPath) {
        _morphInterpolators.set(yr, interpolatePath(flatPath, targetPath))
      }
    }
    return _morphInterpolators
  }

  function update(stepIndex) {
    if (!_svg) return
    if (stepIndex === _currentStep) return
    const prevStep = _currentStep
    _currentStep = stepIndex

    const svgSel = d3.select(_svg)

    // Discrete state: chart title
    if (stepIndex >= 2) {
      svgSel.select('.chart-title').text('Daily Peak PSI, 2014\u20132024')
    } else {
      svgSel.select('.chart-title').text('Haze Days per Year, 2014\u20132024')
    }

    // Discrete state: daily overlay pointer-events
    const g = svgSel.select('g')
    g.select('.daily-overlay').attr('pointer-events', stepIndex >= 2 ? 'all' : 'none')
  }

  function progress(stepIndex, p) {
    if (!_svg) return

    const svgSel = d3.select(_svg)
    const g = svgSel.select('g')
    const ep = easeQuadOut(p)

    if (stepIndex === 0) {
      // === BAR ENTRY with stagger ===
      const numBars = _data.length // 11
      g.selectAll('.bar').each(function (d, i) {
        const staggerStart = i * 0.06
        const barP = easeQuadOut(clamp((p - staggerStart) / (1 - staggerStart), 0, 1))
        const targetX = _xScaleBand(d.year)
        const targetY = _yScaleLinear(d.haze_days)
        const targetH = _innerHeight - targetY

        d3.select(this)
          .attr('x', targetX * barP)
          .attr('y', _innerHeight - targetH * barP)
          .attr('width', _xScaleBand.bandwidth())
          .attr('height', targetH * barP)
          .attr('fill', '#A8B4BA')
          .attr('opacity', barP > 0 ? 1 : 0)
      })

      g.selectAll('.bar-label').each(function (d, i) {
        const staggerStart = i * 0.06
        const barP = easeQuadOut(clamp((p - staggerStart) / (1 - staggerStart), 0, 1))
        const targetX = _xScaleBand(d.year) + _xScaleBand.bandwidth() / 2
        const targetY = _yScaleLinear(d.haze_days) - 4
        const startX = _xScaleBand.bandwidth() / 2
        const startY = _innerHeight - 4

        d3.select(this)
          .attr('x', startX + (targetX - startX) * barP)
          .attr('y', startY + (targetY - startY) * barP)
          .attr('opacity', barP)
      })

      if (p >= 1) _initAnimDone = true

      // Bar-chart axes visible, daily hidden
      g.select('.bars').attr('opacity', 1)
      g.select('.x-axis').attr('opacity', 1)
      g.select('.y-axis').attr('opacity', 1)
      g.select('.x-label').attr('opacity', 1)
      g.select('.y-label').attr('opacity', 1)
      g.select('.gridlines').attr('opacity', 1)
      g.select('.avg-line').attr('opacity', 0.6)
      g.select('.avg-label').attr('opacity', 0.6)
      g.select('.monsoon-annotation').attr('opacity', 1)
      g.select('.daily-psi-g').attr('opacity', 0)
      g.select('.morph-g').attr('opacity', 0)

      // Annotations hidden
      g.select('.annotation-2015').attr('opacity', 0)
      g.select('.annotation-2015-psi').attr('opacity', 0)
      g.select('.monsoon-line-1').attr('opacity', 0)
      g.select('.monsoon-line-2').attr('opacity', 0)

    } else if (stepIndex === 1) {
      // === 2015 HIGHLIGHT ===
      // Snap bars to final positions
      g.selectAll('.bar').each(function (d) {
        d3.select(this)
          .attr('x', _xScaleBand(d.year))
          .attr('y', _yScaleLinear(d.haze_days))
          .attr('width', _xScaleBand.bandwidth())
          .attr('height', _innerHeight - _yScaleLinear(d.haze_days))
          .attr('opacity', 1)
      })
      _initAnimDone = true

      // 2015 bar color interpolation
      g.select('.bar-2015').attr('fill', d3.interpolateRgb('#A8B4BA', '#C0392B')(ep))

      // Data labels fade out
      g.selectAll('.bar-label').attr('opacity', 1 - ep)

      // 2015 annotations fade in
      g.select('.annotation-2015').attr('opacity', ep)
      g.select('.annotation-2015-psi').attr('opacity', ep)

      // Bar chart elements visible
      g.select('.bars').attr('opacity', 1)
      g.select('.x-axis').attr('opacity', 1)
      g.select('.y-axis').attr('opacity', 1)
      g.select('.x-label').attr('opacity', 1)
      g.select('.y-label').attr('opacity', 1)
      g.select('.gridlines').attr('opacity', 1)
      g.select('.avg-line').attr('opacity', 0.6)
      g.select('.avg-label').attr('opacity', 0.6)
      g.select('.monsoon-annotation').attr('opacity', 1)
      g.select('.daily-psi-g').attr('opacity', 0)
      g.select('.morph-g').attr('opacity', 0)
      g.select('.monsoon-line-1').attr('opacity', 0)
      g.select('.monsoon-line-2').attr('opacity', 0)

    } else if (stepIndex >= 2) {
      // === BAR-TO-LINE MORPH ===
      // Sub-phases within progress 0-1:
      //   0.0 - 0.35: Bars fade out, axes fade out
      //   0.0 - 0.70: Flat lines morph to actual daily PSI lines
      //   0.65 - 1.0: Morph lines crossfade to full daily chart

      const barFadeP = clamp(p / 0.35, 0, 1)
      const morphP = easeCubicInOut(clamp(p / 0.70, 0, 1))
      const crossfadeP = clamp((p - 0.65) / 0.35, 0, 1)

      // Bars fade out
      g.selectAll('.bar').attr('opacity', 1 - barFadeP)
      g.selectAll('.bar-label').attr('opacity', 0)

      // Axes fade out
      g.select('.x-axis').attr('opacity', 1 - barFadeP)
      g.select('.y-axis').attr('opacity', 1 - barFadeP)
      g.select('.x-label').attr('opacity', 1 - barFadeP)
      g.select('.y-label').attr('opacity', 1 - barFadeP)
      g.select('.gridlines').attr('opacity', 1 - barFadeP)
      g.select('.avg-line').attr('opacity', 0.6 * (1 - barFadeP))
      g.select('.avg-label').attr('opacity', 0.6 * (1 - barFadeP))
      g.select('.monsoon-annotation').attr('opacity', 1 - barFadeP)

      // Annotations hidden
      g.select('.annotation-2015').attr('opacity', 0)
      g.select('.annotation-2015-psi').attr('opacity', 0)
      g.select('.monsoon-line-1').attr('opacity', 0)
      g.select('.monsoon-line-2').attr('opacity', 0)

      // Morph lines: set path from flat → actual based on morphP
      const interps = _getMorphInterpolators()
      g.selectAll('.morph-line').each(function () {
        const yr = d3.select(this).datum()
        const interp = interps.get(yr)
        if (interp) {
          d3.select(this).attr('d', interp(morphP)).attr('stroke-width', 2)
        }
      })

      // Morph group visible during morph, fades during crossfade
      g.select('.morph-g').attr('opacity', crossfadeP > 0 ? 1 - crossfadeP : (morphP > 0 ? 1 : 0))

      // Daily chart fades in during crossfade
      g.select('.daily-psi-g').attr('opacity', crossfadeP)
    }
  }

  function destroy() {
    if (_tooltip) {
      _tooltip.remove()
      _tooltip = null
    }
    if (_container) {
      d3.select(_container).selectAll('*').remove()
    }
    _container = null
    _svg = null
    _data = null
    _currentStep = -1
  }

  return { init, update, progress, destroy }
}

SECTION_CHARTS.pattern = createPatternChart()
