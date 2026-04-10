/**
 * Change Chart — Story Section 4 (id="change")
 * Before/after PSI line chart showing pre-2020 vs post-2020 annual max PSI
 * Steps:
 *   0: Pre-2020 line only (#6B6B6B)
 *   1: Post-2020 line added (#1B6B4F) + visual gap at 2019-2020 boundary
 *   2: Pre-2020 mean dashed reference line + annotation with data-driven pts shift
 *   3: Honest framing annotation about multiple contributing factors
 *
 * Factory pattern: createChangeChart() returns { init, update, destroy }
 */

import * as d3 from 'd3'
import { SECTION_CHARTS } from '../../scroll.js'

export function createChangeChart() {
  let _container = null
  let _svg = null
  let _data = null
  let _currentStep = -1
  let _tooltip = null
  let _xScale = null
  let _yScale = null
  let _pre2020Mean = 0
  let _postLineRevealed = false
  let _elNinoYears = new Set()

  const margin = { top: 40, right: 30, bottom: 50, left: 60 }
  const HEIGHT = 480

  function init(container, data) {
    _container = container
    _data = data.psi_change

    // Track El Nino years (include 2019 which is borderline)
    const ensoData = data.enso_fire_annual || []
    _elNinoYears = new Set(
      ensoData
        .filter((d) => d.is_el_nino || d.year === 2019)
        .map((d) => d.year)
    )

    // Clear any previous render
    d3.select(container).selectAll('*').remove()

    const width = container.getBoundingClientRect().width || 480
    const innerWidth = width - margin.left - margin.right
    const innerHeight = HEIGHT - margin.top - margin.bottom

    const pre = _data.pre_2020   // [{year, psi_max}]
    const post = _data.post_2020 // [{year, psi_max}]
    const allData = [...pre, ...post]


    // Pre-2020 mean for reference line
    _pre2020Mean = d3.mean(pre, (d) => d.psi_max)

    // Scales
    _xScale = d3
      .scaleLinear()
      .domain([2014, 2024])
      .range([0, innerWidth])

    const yMax = d3.max(allData, (d) => d.psi_max)
    _yScale = d3
      .scaleLinear()
      .domain([0, yMax * 1.15])
      .range([innerHeight, 0])

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
      .text('Annual Peak PSI, 2014\u20132024')

    // Chart group
    const g = svgEl
      .append('g')
      .attr('class', 'chart-g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Horizontal gridlines
    const yTicks = _yScale.ticks(5)
    g.append('g')
      .attr('class', 'gridlines')
      .selectAll('line')
      .data(yTicks)
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => _yScale(d))
      .attr('y2', (d) => _yScale(d))
      .attr('stroke', '#D8D4CE')
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', 1)

    // Y axis
    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(_yScale).ticks(5))
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
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -48)
      .attr('text-anchor', 'middle')
      .attr('fill', '#5A5A5A')
      .attr('font-size', '13px')
      .attr('font-family', 'Public Sans, sans-serif')
      .text('Annual Peak PSI')

    // X axis
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(_xScale)
          .tickValues(allData.map((d) => d.year))
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
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 44)
      .attr('text-anchor', 'middle')
      .attr('fill', '#5A5A5A')
      .attr('font-size', '13px')
      .attr('font-family', 'Public Sans, sans-serif')
      .text('Year')

    // El Nino pill badges on x-axis
    g.select('.x-axis').selectAll('.tick').each(function () {
      const tick = d3.select(this)
      const textEl = tick.select('text')
      const year = +textEl.text()
      if (_elNinoYears.has(year)) {
        const bbox = textEl.node().getBBox()
        tick.insert('rect', 'text')
          .attr('class', 'el-nino-pill')
          .attr('x', bbox.x - 5)
          .attr('y', bbox.y - 2)
          .attr('width', bbox.width + 10)
          .attr('height', bbox.height + 4)
          .attr('rx', 3)
          .attr('fill', '#C0392B')
        textEl.style('fill', '#FFFFFF').style('font-weight', '600')
      }
    })

    // El Nino legend — top-right
    const elNinoLegendG = g.append('g')
      .attr('class', 'el-nino-legend')
      .attr('transform', `translate(${innerWidth - 100}, -20)`)

    const elNinoText = elNinoLegendG
      .append('text')
      .attr('x', 6)
      .attr('y', 12)
      .style('fill', '#FFFFFF')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .attr('font-family', 'Public Sans, sans-serif')
      .text('El Ni\u00f1o Year')

    const elNinoBBox = elNinoText.node().getBBox()
    elNinoLegendG.insert('rect', 'text')
      .attr('x', elNinoBBox.x - 5)
      .attr('y', elNinoBBox.y - 2)
      .attr('width', elNinoBBox.width + 10)
      .attr('height', elNinoBBox.height + 4)
      .attr('rx', 3)
      .attr('fill', '#C0392B')

    // 2019-2020 gap indicator (vertical dashed line at boundary)
    const gapX = (_xScale(2019) + _xScale(2020)) / 2
    g.append('line')
      .attr('class', 'era-gap-line')
      .attr('x1', gapX)
      .attr('y1', 0)
      .attr('x2', gapX)
      .attr('y2', innerHeight)
      .attr('stroke', '#D8D4CE')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4')
      .attr('opacity', 0)

    const postMean = d3.mean(post, (d) => d.psi_max)
    const drop = Math.round(_pre2020Mean - postMean)

    // Pre-2020 mean reference line (step 2) — hidden initially
    g.append('line')
      .attr('class', 'pre-mean-line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', _yScale(_pre2020Mean))
      .attr('y2', _yScale(_pre2020Mean))
      .attr('stroke', '#6B6B6B')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '6,4')
      .attr('opacity', 0)

    g.append('text')
      .attr('class', 'pre-mean-label')
      .attr('x', innerWidth - 4)
      .attr('y', _yScale(_pre2020Mean) - 6)
      .attr('text-anchor', 'end')
      .attr('fill', '#6B6B6B')
      .attr('font-size', '13px')
      .attr('font-family', 'Public Sans, sans-serif')
      .attr('opacity', 0)
      .text(`Pre-2020 avg: ${Math.round(_pre2020Mean)}`)

    // Post-2020 mean reference line (step 2) — hidden initially
    g.append('line')
      .attr('class', 'post-mean-line')
      .attr('x1', _xScale(2020))
      .attr('x2', innerWidth)
      .attr('y1', _yScale(postMean))
      .attr('y2', _yScale(postMean))
      .attr('stroke', '#1B6B4F')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '6,4')
      .attr('opacity', 0)

    g.append('text')
      .attr('class', 'post-mean-label')
      .attr('x', _xScale(2020) + 4)
      .attr('y', _yScale(postMean) + 40)
      .attr('text-anchor', 'start')
      .attr('fill', '#1B6B4F')
      .attr('font-size', '13px')
      .attr('font-family', 'Public Sans, sans-serif')
      .attr('opacity', 0)
      .text(`Post-2020 avg: ${Math.round(postMean)}`)

    // Shift annotation (step 2) — arrow between the two average lines
    const postAvgY = _yScale(postMean)
    const preAvgY = _yScale(_pre2020Mean)
    const annotX = _xScale(2022.2)

    g.append('line')
      .attr('class', 'shift-callout-line')
      .attr('x1', annotX)
      .attr('y1', preAvgY + 2)
      .attr('x2', annotX)
      .attr('y2', postAvgY - 6)
      .attr('stroke', '#C0392B')
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrowhead)')
      .attr('opacity', 0)

    // Arrow marker definition
    const defs = svgEl.append('defs')
    defs
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('refX', 3)
      .attr('refY', 3)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,0 L0,6 L6,3 z')
      .attr('fill', '#C0392B')

    g.append('text')
      .attr('class', 'shift-annotation-text')
      .attr('x', annotX + 6)
      .attr('y', (preAvgY + postAvgY) / 2 - 8)
      .attr('fill', '#C0392B')
      .style('fill', '#C0392B')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .attr('font-family', 'Public Sans, sans-serif')
      .attr('opacity', 0)
      .text(`\u2212${drop} pts`)

    // Honest framing annotation (step 3) — placed in upper-left to avoid
    // overlapping data points near the top of the chart
    g.append('text')
      .attr('class', 'honest-framing-text')
      .attr('x', 8)
      .attr('y', 14)
      .attr('text-anchor', 'start')
      .attr('fill', '#5A5A5A')
      .attr('font-size', '13px')
      .attr('font-style', 'italic')
      .attr('font-family', 'Public Sans, sans-serif')
      .attr('opacity', 0)
      .text('Policy? Pandemic? Climate? All three likely contributed.')

    // Pre-2020 line group
    const preLineG = g.append('g').attr('class', 'pre-line-g')

    const lineFn = d3
      .line()
      .x((d) => _xScale(d.year))
      .y((d) => _yScale(d.psi_max))
      .curve(d3.curveMonotoneX)

    const prePath = preLineG
      .append('path')
      .datum(pre)
      .attr('class', 'pre-line')
      .attr('fill', 'none')
      .attr('stroke', '#6B6B6B')
      .attr('stroke-width', 2)
      .attr('d', lineFn)

    // Stroke-dashoffset reveal animation (700ms)
    const preLength = prePath.node().getTotalLength()
    prePath
      .attr('stroke-dasharray', preLength)
      .attr('stroke-dashoffset', preLength)
      .transition()
      .duration(700)
      .ease(d3.easeQuadOut)
      .attr('stroke-dashoffset', 0)

    // Pre-2020 dots
    preLineG
      .selectAll('circle.pre-dot')
      .data(pre)
      .join('circle')
      .attr('class', 'pre-dot')
      .attr('cx', (d) => _xScale(d.year))
      .attr('cy', (d) => _yScale(d.psi_max))
      .attr('r', 4)
      .attr('fill', '#6B6B6B')

    // Post-2020 line group — hidden initially
    const postLineG = g.append('g').attr('class', 'post-line-g').attr('opacity', 0)

    const postPath = postLineG
      .append('path')
      .datum(post)
      .attr('class', 'post-line')
      .attr('fill', 'none')
      .attr('stroke', '#1B6B4F')
      .attr('stroke-width', 2)
      .attr('d', lineFn)

    // Post-2020 dots
    postLineG
      .selectAll('circle.post-dot')
      .data(post)
      .join('circle')
      .attr('class', 'post-dot')
      .attr('cx', (d) => _xScale(d.year))
      .attr('cy', (d) => _yScale(d.psi_max))
      .attr('r', 4)
      .attr('fill', '#1B6B4F')

    // Tooltip
    _tooltip = d3
      .select(container)
      .append('div')
      .attr('class', 'chart-tooltip')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('opacity', 0)

    // Hover interactions — pre-2020 dots
    preLineG
      .selectAll('.pre-dot')
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
          .html(`<strong>${d.year}</strong><br/>Max PSI: ${d.psi_max.toFixed(1)}`)
      })
      .on('mouseout', () => {
        _tooltip.style('opacity', 0)
      })

    // Hover interactions — post-2020 dots
    postLineG
      .selectAll('.post-dot')
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
          .html(`<strong>${d.year}</strong><br/>Max PSI: ${d.psi_max.toFixed(1)}`)
      })
      .on('mouseout', () => {
        _tooltip.style('opacity', 0)
      })

    _currentStep = 0
  }

  function update(stepIndex) {
    if (!_svg) return
    if (stepIndex === _currentStep) return
    _currentStep = stepIndex

    // Discrete state: reset post-line reveal tracking when going back to step 0
    if (stepIndex === 0) _postLineRevealed = false
  }

  function progress(stepIndex, p) {
    if (!_svg) return

    const svgSel = d3.select(_svg)
    const g = svgSel.select('.chart-g')

    const postG = g.select('.post-line-g')
    const postPath = postG.select('.post-line')

    if (stepIndex === 0) {
      // Step 0: Only pre-2020 line visible, everything else hidden
      postG.attr('opacity', 0)
      g.select('.era-gap-line').attr('opacity', 0)
      g.select('.pre-mean-line').attr('opacity', 0)
      g.select('.pre-mean-label').attr('opacity', 0)
      g.select('.post-mean-line').attr('opacity', 0)
      g.select('.post-mean-label').attr('opacity', 0)
      g.select('.shift-callout-line').attr('opacity', 0)
      g.select('.shift-annotation-text').attr('opacity', 0)
      g.select('.honest-framing-text').attr('opacity', 0)
    } else if (stepIndex === 1) {
      // Step 1: Post-2020 line draws in + gap line
      const ep = easeQuadOut(p)
      postG.attr('opacity', 1)

      // Stroke-dashoffset reveal tied to scroll progress
      const postLength = postPath.node().getTotalLength()
      postPath
        .attr('stroke-dasharray', postLength)
        .attr('stroke-dashoffset', postLength * (1 - ep))
      if (p >= 1) {
        postPath.attr('stroke-dasharray', null).attr('stroke-dashoffset', null)
        _postLineRevealed = true
      }

      g.select('.era-gap-line').attr('opacity', ep)

      // Prior step elements stay hidden
      g.select('.pre-mean-line').attr('opacity', 0)
      g.select('.pre-mean-label').attr('opacity', 0)
      g.select('.post-mean-line').attr('opacity', 0)
      g.select('.post-mean-label').attr('opacity', 0)
      g.select('.shift-callout-line').attr('opacity', 0)
      g.select('.shift-annotation-text').attr('opacity', 0)
      g.select('.honest-framing-text').attr('opacity', 0)
    } else if (stepIndex === 2) {
      // Step 2: Mean lines + shift annotation fade in
      // Snap prior step elements to final state
      postG.attr('opacity', 1)
      postPath.attr('stroke-dasharray', null).attr('stroke-dashoffset', null)
      g.select('.era-gap-line').attr('opacity', 1)

      const ep = easeQuadOut(p)
      g.select('.pre-mean-line').attr('opacity', ep)
      g.select('.pre-mean-label').attr('opacity', ep)
      g.select('.post-mean-line').attr('opacity', ep)
      g.select('.post-mean-label').attr('opacity', ep)
      g.select('.shift-callout-line').attr('opacity', ep)
      g.select('.shift-annotation-text').attr('opacity', ep)

      g.select('.honest-framing-text').attr('opacity', 0)
    } else if (stepIndex >= 3) {
      // Step 3: Honest framing text
      // Snap all prior elements
      postG.attr('opacity', 1)
      postPath.attr('stroke-dasharray', null).attr('stroke-dashoffset', null)
      g.select('.era-gap-line').attr('opacity', 1)
      g.select('.pre-mean-line').attr('opacity', 1)
      g.select('.pre-mean-label').attr('opacity', 1)
      g.select('.post-mean-line').attr('opacity', 1)
      g.select('.post-mean-label').attr('opacity', 1)
      g.select('.shift-callout-line').attr('opacity', 1)
      g.select('.shift-annotation-text').attr('opacity', 1)

      g.select('.honest-framing-text').attr('opacity', easeQuadOut(p))
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
    _yScale = null
    _postLineRevealed = false
  }

  return { init, update, progress, destroy }
}

SECTION_CHARTS.change = createChangeChart()
