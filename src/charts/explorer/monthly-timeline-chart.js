/**
 * Explorer Monthly Timeline — PSI by Month with year overlay (EXPL-NEW-08)
 * Multi-line chart: each year is a line, months on x-axis, PSI on y-axis.
 * All lines visible with color scale by year. Hover dots show tooltip.
 * Shows seasonal pattern and highlights monsoon months.
 */

import * as d3 from 'd3'

export function createMonthlyTimelineChart() {
  let _svg = null
  let _width = 0
  let _height = 0
  let _xScale = null
  let _yScale = null
  let _linesG = null
  let _monsoonG = null
  const margin = { top: 20, right: 30, bottom: 50, left: 60 }
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  let _tooltip = null

  function _ensureTooltip() {
    if (_tooltip) return
    _tooltip = document.createElement('div')
    _tooltip.style.cssText = [
      'position:fixed',
      'background:#FFFFFF',
      'border:1px solid #D8D4CE',
      'border-radius:2px',
      'padding:8px 12px',
      'font-size:13px',
      'font-family:"Public Sans",sans-serif',
      'color:#1A1A1A',
      'pointer-events:none',
      'opacity:0',
      'transition:opacity 150ms',
      'z-index:9999',
      'white-space:nowrap',
    ].join(';')
    document.body.appendChild(_tooltip)
  }

  function _hideTooltip() {
    if (_tooltip) _tooltip.style.opacity = '0'
  }

  // Color scale for year lines
  let _colorScale = null

  function init(container, data, state) {
    const allItems = data.fire_psi_scatter || []
    if (!allItems.length) return

    _width = container.clientWidth || 500
    _height = container.clientHeight || 360
    const innerWidth = _width - margin.left - margin.right
    const innerHeight = _height - margin.top - margin.bottom

    _ensureTooltip()

    const years = [...new Set(allItems.map(d => d.year))].sort()
    _colorScale = d3.scaleSequential()
      .domain([years[0], years[years.length - 1]])
      .interpolator(d3.interpolate('#6B9FAF', '#1B4F5C'))

    // Scales
    _xScale = d3.scalePoint()
      .domain(MONTHS)
      .range([margin.left, _width - margin.right])
      .padding(0.5)

    _yScale = d3.scaleLinear()
      .domain([0, d3.max(allItems, d => d.psi_mean) || 120])
      .range([_height - margin.bottom, margin.top])
      .nice()

    const svgEl = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${_width} ${_height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')

    _svg = svgEl

    // Gridlines
    svgEl.append('g').attr('class', 'grid-y')
      .selectAll('line')
      .data(_yScale.ticks(5))
      .join('line')
      .attr('x1', margin.left).attr('x2', _width - margin.right)
      .attr('y1', d => _yScale(d)).attr('y2', d => _yScale(d))
      .attr('stroke', '#E8E4DE').attr('stroke-width', 1)

    // SW Monsoon shading (Jun-Sep)
    _monsoonG = svgEl.append('g').attr('class', 'monsoon-shade')
    const junX = _xScale('Jun')
    const sepX = _xScale('Sep')
    const shadeWidth = sepX - junX + _xScale.step() * 0.5
    _monsoonG.append('rect')
      .attr('x', junX - _xScale.step() * 0.25)
      .attr('y', margin.top)
      .attr('width', shadeWidth)
      .attr('height', innerHeight)
      .attr('fill', 'rgba(192, 57, 43, 0.06)')

    _monsoonG.append('text')
      .attr('x', (junX + sepX) / 2)
      .attr('y', margin.top + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#5A5A5A')
      .attr('font-size', '11px')
      .attr('font-style', 'italic')
      .attr('font-family', '"Public Sans",sans-serif')
      .text('SW Monsoon')

    // X axis
    svgEl.append('g')
      .attr('class', 'axis-x')
      .attr('transform', `translate(0,${_height - margin.bottom})`)
      .call(d3.axisBottom(_xScale))
      .call(g => {
        g.select('.domain').remove()
        g.selectAll('.tick line').remove()
        g.selectAll('.tick text')
          .attr('fill', '#5A5A5A').attr('font-size', '12px')
          .attr('font-family', '"Public Sans",sans-serif')
      })

    // X axis label
    svgEl.append('text')
      .attr('x', margin.left + innerWidth / 2).attr('y', _height - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', '#5A5A5A').attr('font-size', '12px')
      .attr('font-family', '"Public Sans",sans-serif')
      .text('Month')

    // Y axis
    svgEl.append('g')
      .attr('class', 'axis-y')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(_yScale).ticks(5))
      .call(g => {
        g.select('.domain').remove()
        g.selectAll('.tick line').remove()
        g.selectAll('.tick text')
          .attr('fill', '#5A5A5A').attr('font-size', '12px')
          .attr('font-family', '"Public Sans",sans-serif')
      })

    // Y axis label
    svgEl.append('text')
      .attr('transform', `translate(${14},${margin.top + innerHeight / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .attr('fill', '#5A5A5A').attr('font-size', '12px')
      .attr('font-family', '"Public Sans",sans-serif')
      .text('Monthly PSI Mean')

    // Lines group
    _linesG = svgEl.append('g').attr('class', 'lines')

    render(container, data, state)
  }

  function render(container, filteredData, state) {
    if (!_svg || !_linesG) return

    const items = filteredData.fire_psi_scatter || []

    // Build set of months that have data (for season filtering)
    const activeMonths = new Set(items.map(d => d.month))

    // Group by year
    const byYear = d3.group(items, d => d.year)

    // Expand each year's points to all 12 months, with null for missing months.
    // This lets .defined() break the line at season gaps instead of connecting across them.
    const yearEntries = Array.from(byYear.entries())
      .map(([year, pts]) => {
        const byMonth = new Map(pts.map(d => [d.month, d]))
        const fullPoints = []
        for (let m = 1; m <= 12; m++) {
          fullPoints.push(byMonth.get(m) || { month: m, psi_mean: null, year, fire_count: 0 })
        }
        return { year, points: fullPoints }
      })

    const lineFn = d3.line()
      .defined(d => d.psi_mean !== null)
      .x(d => _xScale(MONTHS[d.month - 1]))
      .y(d => _yScale(d.psi_mean))
      .curve(d3.curveMonotoneX)

    // Update Y scale
    const yMax = d3.max(items, d => d.psi_mean) || 120
    _yScale.domain([0, yMax * 1.1]).nice()

    _svg.select('.axis-y')
      .transition().duration(400).ease(d3.easeCubicOut)
      .call(d3.axisLeft(_yScale).ticks(5))
      .call(g => {
        g.select('.domain').remove()
        g.selectAll('.tick line').remove()
        g.selectAll('.tick text')
          .attr('fill', '#5A5A5A').attr('font-size', '12px')
          .attr('font-family', '"Public Sans",sans-serif')
      })

    // Update gridlines
    const gridLines = _svg.select('.grid-y').selectAll('line').data(_yScale.ticks(5))
    gridLines.exit().remove()
    gridLines.enter().append('line').merge(gridLines)
      .transition().duration(400)
      .attr('x1', margin.left).attr('x2', _width - margin.right)
      .attr('y1', d => _yScale(d)).attr('y2', d => _yScale(d))
      .attr('stroke', '#E8E4DE').attr('stroke-width', 1)

    // D3 join for year lines
    const yearLines = _linesG.selectAll('.year-line')
      .data(yearEntries, d => d.year)

    yearLines.exit()
      .interrupt()
      .transition().duration(200)
      .attr('opacity', 0)
      .remove()

    const enterLines = yearLines.enter()
      .append('path')
      .attr('class', 'year-line')
      .attr('fill', 'none')
      .attr('d', d => lineFn(d.points))
      .attr('stroke', d => _colorScale ? _colorScale(d.year) : '#2C6E8A')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0)

    enterLines.merge(yearLines)
      .interrupt()
      .transition().duration(400).ease(d3.easeQuadOut)
      .attr('d', d => lineFn(d.points))
      .attr('stroke', d => _colorScale ? _colorScale(d.year) : '#2C6E8A')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.6)

    // Hover dots — only for months with actual data
    // Two layers: invisible wide hit targets + visible styled dots
    _linesG.selectAll('.year-dot-hit').remove()
    _linesG.selectAll('.year-dot').remove()

    // Visible dots (small, appear on hover via hit target)
    const dots = _linesG.selectAll('.year-dot')
      .data(items, d => `${d.year}-${d.month}`)
      .join('circle')
      .attr('class', 'year-dot')
      .attr('cx', d => _xScale(MONTHS[d.month - 1]))
      .attr('cy', d => _yScale(d.psi_mean))
      .attr('r', 3)
      .attr('fill', d => _colorScale ? _colorScale(d.year) : '#2C6E8A')
      .attr('opacity', 0)
      .attr('pointer-events', 'none')

    // Invisible hit targets (larger radius for easy hovering)
    _linesG.selectAll('.year-dot-hit')
      .data(items, d => `${d.year}-${d.month}`)
      .join('circle')
      .attr('class', 'year-dot-hit')
      .attr('cx', d => _xScale(MONTHS[d.month - 1]))
      .attr('cy', d => _yScale(d.psi_mean))
      .attr('r', 12)
      .attr('fill', 'transparent')
      .attr('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        if (!_tooltip) return
        _tooltip.innerHTML = `<strong>${MONTHS[d.month - 1]} ${d.year}</strong><br>PSI: ${d.psi_mean.toFixed(1)}<br>Fires: ${d.fire_count.toLocaleString()}`
        _tooltip.style.opacity = '1'
        _tooltip.style.left = (event.clientX + 12) + 'px'
        _tooltip.style.top = (event.clientY - 10) + 'px'

        // Show the matching visible dot
        dots.filter(dd => dd.year === d.year && dd.month === d.month)
          .attr('opacity', 1).attr('r', 5)
      })
      .on('mousemove', (event) => {
        if (!_tooltip) return
        _tooltip.style.left = (event.clientX + 12) + 'px'
        _tooltip.style.top = (event.clientY - 10) + 'px'
      })
      .on('mouseleave', (event, d) => {
        _hideTooltip()
        dots.filter(dd => dd.year === d.year && dd.month === d.month)
          .attr('opacity', 0).attr('r', 3)
      })
  }

  return { id: 'chart-monthly', init, render }
}
