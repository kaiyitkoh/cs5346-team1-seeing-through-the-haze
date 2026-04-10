/**
 * Climate Chart — Story Section 3 (id="climate")
 * Dual-axis line chart: Indonesian fire detections + ONI index 2014-2024
 * Steps:
 *   0: Fire line only (#C0392B)
 *   1: ONI line added (#2C6E8A, dashed), zero-line, updated legend
 *   2: El Nino years (2015/2019/2023) highlighted as red bold x-axis ticks, threshold line
 *   3: 2015 peak annotated with circle marker and callout
 *
 * Factory pattern: createClimateChart() returns { init, update, destroy }
 */

import * as d3 from 'd3'
import { SECTION_CHARTS } from '../../scroll.js'

export function createClimateChart() {
  let _container = null
  let _svg = null
  let _data = null
  let _currentStep = -1
  let _tooltip = null
  let _xScale = null
  let _yFire = null
  let _yONI = null
  let _innerWidth = 0
  let _innerHeight = 0

  const margin = { top: 64, right: 70, bottom: 50, left: 70 }
  const HEIGHT = 504

  function init(container, data) {
    _container = container
    _data = data.enso_fire_annual.map((d) =>
      d.year === 2019 ? { ...d, is_el_nino: true } : d
    )

    // Clear any previous render
    d3.select(container).selectAll('*').remove()

    const width = container.getBoundingClientRect().width || 480
    _innerWidth = width - margin.left - margin.right
    _innerHeight = HEIGHT - margin.top - margin.bottom

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
      .text('Indonesian Fires and El Ni\u00f1o, 2014\u20132024')

    // Scales
    const years = _data.map((d) => d.year)
    const yearMin = d3.min(years)
    const yearMax = d3.max(years)

    _xScale = d3
      .scaleLinear()
      .domain([yearMin, yearMax])
      .range([0, _innerWidth])

    const fireMax = d3.max(_data, (d) => d.idn_fire_count)
    _yFire = d3
      .scaleLinear()
      .domain([0, fireMax * 1.1])
      .range([_innerHeight, 0])

    // Fixed ONI domain so negative La Nina values are always visible
    _yONI = d3
      .scaleLinear()
      .domain([-3, 3])
      .range([_innerHeight, 0])

    // Chart group
    const g = svgEl
      .append('g')
      .attr('class', 'chart-g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Horizontal gridlines (based on fire scale)
    const yTicks = _yFire.ticks(5)
    g.append('g')
      .attr('class', 'gridlines')
      .selectAll('line')
      .data(yTicks)
      .join('line')
      .attr('x1', 0)
      .attr('x2', _innerWidth)
      .attr('y1', (d) => _yFire(d))
      .attr('y2', (d) => _yFire(d))
      .attr('stroke', '#D8D4CE')
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', 1)

    // ONI zero-line (step 1) — hidden initially
    g.append('line')
      .attr('class', 'oni-zero-line')
      .attr('x1', 0)
      .attr('x2', _innerWidth)
      .attr('y1', _yONI(0))
      .attr('y2', _yONI(0))
      .attr('stroke', '#D8D4CE')
      .attr('stroke-width', 1)
      .attr('opacity', 0)

    // El Niño threshold line at ONI = 0.5 — hidden initially
    g.append('line')
      .attr('class', 'oni-threshold-line')
      .attr('x1', 0)
      .attr('x2', _innerWidth)
      .attr('y1', _yONI(0.5))
      .attr('y2', _yONI(0.5))
      .attr('stroke', '#C0392B')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,3')
      .attr('opacity', 0)

    // Threshold label at right end
    g.append('text')
      .attr('class', 'oni-threshold-label')
      .attr('x', _innerWidth * 0.85)
      .attr('y', _yONI(0.5) - 6)
      .attr('text-anchor', 'end')
      .attr('fill', '#C0392B')
      .attr('font-size', '11px')
      .attr('font-family', 'Public Sans, sans-serif')
      .attr('opacity', 0)
      .text('El Ni\u00f1o threshold (0.5)')

    // Left y-axis (fire)
    g.append('g')
      .attr('class', 'y-axis-left')
      .call(d3.axisLeft(_yFire).ticks(5).tickFormat(d3.format(',d')))
      .call((grp) => {
        grp.select('.domain').attr('stroke', '#D8D4CE')
        grp.selectAll('.tick line').remove()
        grp.selectAll('.tick text')
          .attr('fill', '#5A5A5A')
          .attr('font-size', '12px')
          .attr('font-family', 'Public Sans, sans-serif')
      })

    // Left y-axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -_innerHeight / 2)
      .attr('y', -58)
      .attr('text-anchor', 'middle')
      .attr('fill', '#C0392B')
      .attr('font-size', '13px')
      .attr('font-family', 'Public Sans, sans-serif')
      .text('Indonesian Fire Detections')

    // Right y-axis (ONI) — initially hidden
    g.append('g')
      .attr('class', 'y-axis-right')
      .attr('transform', `translate(${_innerWidth}, 0)`)
      .call(d3.axisRight(_yONI).ticks(5))
      .call((grp) => {
        grp.select('.domain').attr('stroke', '#D8D4CE')
        grp.selectAll('.tick line').remove()
        grp.selectAll('.tick text')
          .attr('fill', '#5A5A5A')
          .attr('font-size', '12px')
          .attr('font-family', 'Public Sans, sans-serif')
      })
      .attr('opacity', 0)

    // Right y-axis label — initially hidden
    g.append('text')
      .attr('class', 'oni-axis-label')
      .attr('transform', 'rotate(90)')
      .attr('x', _innerHeight / 2)
      .attr('y', -(_innerWidth + 58))
      .attr('text-anchor', 'middle')
      .attr('fill', '#2C6E8A')
      .attr('font-size', '13px')
      .attr('font-family', 'Public Sans, sans-serif')
      .attr('opacity', 0)
      .text('ONI Index')

    // X axis
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${_innerHeight})`)
      .call(
        d3
          .axisBottom(_xScale)
          .tickValues(_data.map((d) => d.year))
          .tickFormat(d3.format('d'))
      )
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
      .attr('x', _innerWidth / 2)
      .attr('y', _innerHeight + 44)
      .attr('text-anchor', 'middle')
      .attr('fill', '#5A5A5A')
      .attr('font-size', '13px')
      .attr('font-family', 'Public Sans, sans-serif')
      .text('Year')

    // Fire line group
    const fireLineG = g.append('g').attr('class', 'fire-line-g')

    const fireLine = d3
      .line()
      .x((d) => _xScale(d.year))
      .y((d) => _yFire(d.idn_fire_count))
      .curve(d3.curveMonotoneX)

    const firePath = fireLineG
      .append('path')
      .datum(_data)
      .attr('class', 'fire-line')
      .attr('fill', 'none')
      .attr('stroke', '#C0392B')
      .attr('stroke-width', 2)
      .attr('d', fireLine)

    // Stroke-dashoffset reveal animation (700ms)
    const fireLength = firePath.node().getTotalLength()
    firePath
      .attr('stroke-dasharray', fireLength)
      .attr('stroke-dashoffset', fireLength)
      .transition()
      .duration(700)
      .ease(d3.easeQuadOut)
      .attr('stroke-dashoffset', 0)

    // Fire data dots (visible markers for hover affordance)
    fireLineG
      .selectAll('circle.fire-dot')
      .data(_data)
      .join('circle')
      .attr('class', 'fire-dot')
      .attr('cx', (d) => _xScale(d.year))
      .attr('cy', (d) => _yFire(d.idn_fire_count))
      .attr('r', 3)
      .attr('fill', '#C0392B')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('opacity', 1)

    // ONI line group — hidden initially
    const oniLineG = g.append('g').attr('class', 'oni-line-g').attr('opacity', 0)

    const oniLine = d3
      .line()
      .x((d) => _xScale(d.year))
      .y((d) => _yONI(d.oni_avg))
      .curve(d3.curveMonotoneX)

    oniLineG
      .append('path')
      .datum(_data)
      .attr('class', 'oni-line')
      .attr('fill', 'none')
      .attr('stroke', '#2C6E8A')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,4')
      .attr('d', oniLine)

    // ONI data dots (visible markers for hover affordance)
    oniLineG
      .selectAll('circle.oni-dot')
      .data(_data)
      .join('circle')
      .attr('class', 'oni-dot')
      .attr('cx', (d) => _xScale(d.year))
      .attr('cy', (d) => _yONI(d.oni_avg))
      .attr('r', 3)
      .attr('fill', '#2C6E8A')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('opacity', 1)


    // 2015 annotation (step 3) — hidden initially
    const d2015 = _data.find((d) => d.year === 2015)
    if (d2015) {
      const ax = _xScale(2015)
      const ay = _yFire(d2015.idn_fire_count)

      g.append('circle')
        .attr('class', 'annotation-2015-circle')
        .attr('cx', ax)
        .attr('cy', ay)
        .attr('r', 7)
        .attr('fill', 'none')
        .attr('stroke', '#1A6B73')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0)

      // Callout line points right and down from the peak circle to avoid
      // overflowing above chart margin.top (peak is near the top of the chart)
      g.append('line')
        .attr('class', 'annotation-2015-line')
        .attr('x1', ax + 9)
        .attr('y1', ay)
        .attr('x2', ax + 40)
        .attr('y2', ay + 40)
        .attr('stroke', '#1A6B73')
        .attr('stroke-width', 1)
        .attr('opacity', 0)

      g.append('text')
        .attr('class', 'annotation-2015-text')
        .attr('x', ax + 44)
        .attr('y', ay + 44)
        .attr('fill', '#5A5A5A')
        .attr('font-size', '13px')
        .attr('font-style', 'italic')
        .attr('font-family', 'Public Sans, sans-serif')
        .attr('opacity', 0)
        .text(`2015 peak: ${d2015.idn_fire_count.toLocaleString()} fires (annual)`)
    }

    // Legend group — top-right, clear of both title and axes
    const legendG = g.append('g').attr('class', 'legend').attr('transform', `translate(${_innerWidth - 360}, -20)`)

    // Fire legend item (always visible) — horizontal layout
    legendG
      .append('line')
      .attr('x1', 0)
      .attr('x2', 20)
      .attr('y1', 8)
      .attr('y2', 8)
      .attr('stroke', '#C0392B')
      .attr('stroke-width', 2)

    legendG
      .append('text')
      .attr('x', 26)
      .attr('y', 12)
      .attr('fill', '#5A5A5A')
      .attr('font-size', '13px')
      .attr('font-family', 'Public Sans, sans-serif')
      .text('Fire Detections')

    // ONI legend item — hidden initially, offset horizontally
    const oniLegendG = legendG.append('g').attr('class', 'oni-legend').attr('opacity', 0).attr('transform', 'translate(140, 0)')

    oniLegendG
      .append('line')
      .attr('x1', 0)
      .attr('x2', 20)
      .attr('y1', 8)
      .attr('y2', 8)
      .attr('stroke', '#2C6E8A')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,4')

    oniLegendG
      .append('text')
      .attr('x', 26)
      .attr('y', 12)
      .attr('fill', '#5A5A5A')
      .attr('font-size', '13px')
      .attr('font-family', 'Public Sans, sans-serif')
      .text('ONI Index')

    // El Nino legend item — red pill style, hidden initially
    const elNinoLegendG = legendG.append('g').attr('class', 'el-nino-legend').attr('opacity', 0).attr('transform', 'translate(260, 0)')

    const elNinoText = elNinoLegendG
      .append('text')
      .attr('x', 6)
      .attr('y', 12)
      .style('fill', '#FFFFFF')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .attr('font-family', 'Public Sans, sans-serif')
      .text('El Ni\u00f1o Year')

    // Red pill background behind legend text
    const elNinoBBox = elNinoText.node().getBBox()
    elNinoLegendG.insert('rect', 'text')
      .attr('x', elNinoBBox.x - 5)
      .attr('y', elNinoBBox.y - 2)
      .attr('width', elNinoBBox.width + 10)
      .attr('height', elNinoBBox.height + 4)
      .attr('rx', 3)
      .attr('fill', '#C0392B')

    // Tooltip
    _tooltip = d3
      .select(container)
      .append('div')
      .attr('class', 'chart-tooltip')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('opacity', 0)

    // Hover interactions — fire dots
    g.selectAll('.fire-dot')
      .on('mouseover', function (event, d) {
        const rect = this.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        const x = rect.left - containerRect.left + rect.width / 2
        const y = rect.top - containerRect.top - 8

        d3.select(this).attr('r', 5)
        _tooltip
          .style('opacity', 1)
          .style('left', `${x}px`)
          .style('top', `${y}px`)
          .style('transform', 'translate(-50%, -100%)')
          .html(`<strong>${d.year}</strong><br/>${d.idn_fire_count.toLocaleString()} fire detections`)
      })
      .on('mouseout', function () {
        d3.select(this).attr('r', 3)
        _tooltip.style('opacity', 0)
      })

    // Hover interactions — ONI dots
    g.selectAll('.oni-dot')
      .on('mouseover', function (event, d) {
        const rect = this.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        const x = rect.left - containerRect.left + rect.width / 2
        const y = rect.top - containerRect.top - 8

        d3.select(this).attr('r', 5)
        _tooltip
          .style('opacity', 1)
          .style('left', `${x}px`)
          .style('top', `${y}px`)
          .style('transform', 'translate(-50%, -100%)')
          .html(`<strong>${d.year}</strong><br/>ONI: ${d.oni_avg.toFixed(2)}${d.is_el_nino ? ' (El Ni\u00f1o)' : ''}`)
      })
      .on('mouseout', function () {
        d3.select(this).attr('r', 3)
        _tooltip.style('opacity', 0)
      })

    _currentStep = 0
  }

  let _oniRevealed = false
  let _pillsCreated = false

  function update(stepIndex) {
    if (!_svg) return
    if (stepIndex === _currentStep) return
    const prevStep = _currentStep
    _currentStep = stepIndex

    const svgSel = d3.select(_svg)
    const g = svgSel.select('.chart-g')

    // Discrete state: reset ONI reveal flag when going back to step 0
    if (stepIndex < 1) {
      _oniRevealed = false
      const oniPath = g.select('.oni-line-g').select('.oni-line')
      oniPath.attr('stroke-dasharray', '6,4').attr('stroke-dashoffset', null)
    }

    // Ensure El Niño pills exist when entering step 2+
    const elNinoYearSet = new Set(_data.filter((d) => d.is_el_nino).map((d) => d.year))
    if (stepIndex >= 2 && !_pillsCreated) {
      g.select('.x-axis').selectAll('.tick').each(function () {
        const tick = d3.select(this)
        const textEl = tick.select('text')
        const year = +textEl.text()
        if (elNinoYearSet.has(year)) {
          if (tick.select('.el-nino-pill').empty()) {
            const bbox = textEl.node().getBBox()
            tick.insert('rect', 'text')
              .attr('class', 'el-nino-pill')
              .attr('x', bbox.x - 5)
              .attr('y', bbox.y - 2)
              .attr('width', bbox.width + 10)
              .attr('height', bbox.height + 4)
              .attr('rx', 3)
              .attr('fill', '#C0392B')
              .attr('opacity', 0)
          }
        }
      })
      _pillsCreated = true
    }

    // Remove pills when going below step 2
    if (stepIndex < 2 && _pillsCreated) {
      g.select('.x-axis').selectAll('.el-nino-pill').remove()
      g.select('.x-axis').selectAll('.tick').each(function () {
        const tick = d3.select(this)
        const textEl = tick.select('text')
        const year = +textEl.text()
        if (elNinoYearSet.has(year)) {
          textEl.style('fill', '#5A5A5A').style('font-weight', 'normal')
        }
      })
      _pillsCreated = false
    }
  }

  function progress(stepIndex, p) {
    if (!_svg) return

    const svgSel = d3.select(_svg)
    const g = svgSel.select('.chart-g')
    const ep = easeQuadOut(p)

    if (stepIndex === 0) {
      // Fire line only — hide all ONI elements
      g.select('.oni-line-g').attr('opacity', 0)
      g.select('.y-axis-right').attr('opacity', 0)
      g.select('.oni-axis-label').attr('opacity', 0)
      g.select('.oni-zero-line').attr('opacity', 0)
      g.select('.oni-legend').attr('opacity', 0)
      g.select('.el-nino-legend').attr('opacity', 0)
      g.select('.oni-threshold-line').attr('opacity', 0)
      g.select('.oni-threshold-label').attr('opacity', 0)
      g.select('.annotation-2015-circle').attr('opacity', 0)
      g.select('.annotation-2015-line').attr('opacity', 0)
      g.select('.annotation-2015-text').attr('opacity', 0)
    } else if (stepIndex === 1) {
      // ONI line reveals with scroll
      const oniG = g.select('.oni-line-g')
      const oniPath = oniG.select('.oni-line')
      oniG.attr('opacity', 1)

      // Stroke-dashoffset reveal tied to scroll progress
      if (!_oniRevealed) {
        const oniLength = oniPath.node().getTotalLength()
        oniPath
          .attr('stroke-dasharray', oniLength)
          .attr('stroke-dashoffset', oniLength * (1 - ep))
        if (p >= 1) {
          oniPath.attr('stroke-dasharray', '6,4').attr('stroke-dashoffset', null)
          _oniRevealed = true
        }
      }

      g.select('.y-axis-right').attr('opacity', ep)
      g.select('.oni-axis-label').attr('opacity', ep)
      g.select('.oni-zero-line').attr('opacity', ep)
      g.select('.oni-legend').attr('opacity', ep)

      // Hide step 2+ elements
      g.select('.el-nino-legend').attr('opacity', 0)
      g.select('.oni-threshold-line').attr('opacity', 0)
      g.select('.oni-threshold-label').attr('opacity', 0)
      g.select('.annotation-2015-circle').attr('opacity', 0)
      g.select('.annotation-2015-line').attr('opacity', 0)
      g.select('.annotation-2015-text').attr('opacity', 0)
    } else if (stepIndex === 2) {
      // Snap ONI elements to fully visible
      g.select('.oni-line-g').attr('opacity', 1)
      const oniPath = g.select('.oni-line-g').select('.oni-line')
      oniPath.attr('stroke-dasharray', '6,4').attr('stroke-dashoffset', null)
      _oniRevealed = true
      g.select('.y-axis-right').attr('opacity', 1)
      g.select('.oni-axis-label').attr('opacity', 1)
      g.select('.oni-zero-line').attr('opacity', 1)
      g.select('.oni-legend').attr('opacity', 1)

      // El Niño pills + legend + threshold fade in
      const elNinoYearSet = new Set(_data.filter((d) => d.is_el_nino).map((d) => d.year))
      g.select('.x-axis').selectAll('.tick').each(function () {
        const tick = d3.select(this)
        const textEl = tick.select('text')
        const year = +textEl.text()
        if (elNinoYearSet.has(year)) {
          tick.select('.el-nino-pill').attr('opacity', ep)
          textEl
            .style('fill', d3.interpolateRgb('#5A5A5A', '#FFFFFF')(ep))
            .style('font-weight', ep > 0.5 ? '600' : 'normal')
        }
      })

      g.select('.el-nino-legend').attr('opacity', ep)
      g.select('.oni-threshold-line').attr('opacity', 0.4 * ep)
      g.select('.oni-threshold-label').attr('opacity', 0.7 * ep)

      // Hide step 3 elements
      g.select('.annotation-2015-circle').attr('opacity', 0)
      g.select('.annotation-2015-line').attr('opacity', 0)
      g.select('.annotation-2015-text').attr('opacity', 0)
    } else if (stepIndex >= 3) {
      // Snap all prior elements
      g.select('.oni-line-g').attr('opacity', 1)
      g.select('.y-axis-right').attr('opacity', 1)
      g.select('.oni-axis-label').attr('opacity', 1)
      g.select('.oni-zero-line').attr('opacity', 1)
      g.select('.oni-legend').attr('opacity', 1)
      g.select('.el-nino-legend').attr('opacity', 1)
      g.select('.oni-threshold-line').attr('opacity', 0.4)
      g.select('.oni-threshold-label').attr('opacity', 0.7)

      // 2015 annotation fades in
      g.select('.annotation-2015-circle').attr('opacity', ep)
      g.select('.annotation-2015-line').attr('opacity', ep)
      g.select('.annotation-2015-text').attr('opacity', ep)
    }
  }

  function easeQuadOut(t) {
    return 1 - (1 - t) * (1 - t)
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
    _xScale = null
    _yFire = null
    _yONI = null
  }

  return { init, update, progress, destroy }
}

SECTION_CHARTS.climate = createClimateChart()
