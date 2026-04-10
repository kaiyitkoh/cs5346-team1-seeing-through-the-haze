/**
 * Explorer Scatter Chart — Fire Count vs PSI (EXPL-NEW-05)
 * Scatter plot with OLS regression line computed inline.
 * Dots: #2C6E8A. Regression line: #1A1A1A dashed.
 */

import * as d3 from 'd3'

export function createScatterChart() {
  let _svg = null
  let _dotsG = null
  let _regressionLine = null
  let _width = 0
  let _height = 0
  let _xScale = null
  let _yScale = null
  const margin = { top: 20, right: 20, bottom: 50, left: 60 }

  // ---- Tooltip ----
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

  function _showTooltip(event, d) {
    if (!_tooltip) return
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const monthLabel = monthNames[(d.month - 1)] || d.month
    _tooltip.innerHTML = [
      `<strong>${monthLabel} ${d.year}</strong>`,
      `Fire count: ${d.fire_count.toLocaleString()}`,
      `PSI mean: ${d.psi_mean.toFixed(1)}`,
      `Season: ${d.season}`,
    ].join('<br>')
    _tooltip.style.opacity = '1'
    _tooltip.style.left = (event.clientX + 12) + 'px'
    _tooltip.style.top = (event.clientY - 10) + 'px'
  }

  function _hideTooltip() {
    if (_tooltip) _tooltip.style.opacity = '0'
  }

  // ---- OLS regression ----
  function _computeOLS(items) {
    const n = items.length
    if (n < 2) return null
    const sumX = d3.sum(items, d => d.fire_count)
    const sumY = d3.sum(items, d => d.psi_mean)
    const sumXY = d3.sum(items, d => d.fire_count * d.psi_mean)
    const sumX2 = d3.sum(items, d => d.fire_count * d.fire_count)
    const denom = n * sumX2 - sumX * sumX
    if (denom === 0) return null
    const slope = (n * sumXY - sumX * sumY) / denom
    const intercept = (sumY - slope * sumX) / n
    return { slope, intercept }
  }

  // ---- init ----
  function init(container, data, state) {
    const items = data.fire_psi_scatter || []

    _width = container.clientWidth || 500
    _height = container.clientHeight || 360
    const innerWidth = _width - margin.left - margin.right
    const innerHeight = _height - margin.top - margin.bottom

    _ensureTooltip()

    _xScale = d3.scaleLinear()
      .domain([0, d3.max(items, d => d.fire_count) || 1])
      .range([margin.left, _width - margin.right])
      .nice()

    _yScale = d3.scaleLinear()
      .domain([0, d3.max(items, d => d.psi_mean) || 1])
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
    svgEl.append('g').attr('class', 'grid-x')
      .selectAll('line')
      .data(_xScale.ticks(5))
      .join('line')
      .attr('x1', d => _xScale(d)).attr('x2', d => _xScale(d))
      .attr('y1', margin.top).attr('y2', _height - margin.bottom)
      .attr('stroke', '#E8E4DE').attr('stroke-width', 1)

    svgEl.append('g').attr('class', 'grid-y')
      .selectAll('line')
      .data(_yScale.ticks(5))
      .join('line')
      .attr('x1', margin.left).attr('x2', _width - margin.right)
      .attr('y1', d => _yScale(d)).attr('y2', d => _yScale(d))
      .attr('stroke', '#E8E4DE').attr('stroke-width', 1)

    // X axis
    svgEl.append('g')
      .attr('class', 'axis-x')
      .attr('transform', `translate(0,${_height - margin.bottom})`)
      .call(d3.axisBottom(_xScale).ticks(5))
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
      .text('Monthly Fire Count')

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

    // Annotation: why PSI mean
    svgEl.append('text')
      .attr('x', _width - margin.right)
      .attr('y', margin.top + 12)
      .attr('text-anchor', 'end')
      .attr('fill', '#8A8A8A').attr('font-size', '11px')
      .attr('font-style', 'italic')
      .attr('font-family', '"Public Sans",sans-serif')
      .text('Mean daily peak PSI used. Captures sustained exposure across the month.')

    // Regression line
    _regressionLine = svgEl.append('line')
      .attr('class', 'regression-line')
      .attr('stroke', '#1A1A1A')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,3')
      .attr('opacity', 0)

    // Dots group
    _dotsG = svgEl.append('g').attr('class', 'dots')

    render(container, data, state)
  }

  // ---- render ----
  function render(container, filteredData, state) {
    if (!_svg || !_dotsG) return

    const items = filteredData.fire_psi_scatter || []

    // Rescale axes
    if (items.length > 0) {
      _xScale.domain([0, d3.max(items, d => d.fire_count) || 1]).nice()
      _yScale.domain([0, d3.max(items, d => d.psi_mean) || 1]).nice()
    }

    // Transition axes
    _svg.select('.axis-x')
      .transition().duration(400).ease(d3.easeCubicOut)
      .call(d3.axisBottom(_xScale).ticks(5))
      .call(g => {
        g.select('.domain').remove()
        g.selectAll('.tick line').remove()
        g.selectAll('.tick text')
          .attr('fill', '#5A5A5A').attr('font-size', '12px')
          .attr('font-family', '"Public Sans",sans-serif')
      })

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
    const xGridData = _xScale.ticks(5)
    const xGrid = _svg.select('.grid-x').selectAll('line').data(xGridData)
    xGrid.exit().remove()
    xGrid.enter().append('line')
      .attr('y1', margin.top).attr('y2', _height - margin.bottom)
      .attr('stroke', '#E8E4DE').attr('stroke-width', 1)
      .merge(xGrid)
      .transition().duration(400).ease(d3.easeCubicOut)
      .attr('x1', d => _xScale(d)).attr('x2', d => _xScale(d))

    const yGridData = _yScale.ticks(5)
    const yGrid = _svg.select('.grid-y').selectAll('line').data(yGridData)
    yGrid.exit().remove()
    yGrid.enter().append('line')
      .attr('x1', margin.left).attr('x2', _width - margin.right)
      .attr('stroke', '#E8E4DE').attr('stroke-width', 1)
      .merge(yGrid)
      .transition().duration(400).ease(d3.easeCubicOut)
      .attr('y1', d => _yScale(d)).attr('y2', d => _yScale(d))

    // Update regression line
    const ols = _computeOLS(items)
    if (ols && items.length >= 2) {
      const xDomain = _xScale.domain()
      _regressionLine
        .transition().duration(400).ease(d3.easeCubicOut)
        .attr('x1', _xScale(xDomain[0]))
        .attr('y1', _yScale(ols.slope * xDomain[0] + ols.intercept))
        .attr('x2', _xScale(xDomain[1]))
        .attr('y2', _yScale(ols.slope * xDomain[1] + ols.intercept))
        .attr('opacity', 0.7)
    } else {
      _regressionLine.transition().duration(400).attr('opacity', 0)
    }

    // D3 join for dots
    const dots = _dotsG.selectAll('circle')
      .data(items, d => `${d.year}-${d.month}`)

    dots.enter()
      .append('circle')
      .attr('cx', d => _xScale(d.fire_count))
      .attr('cy', d => _yScale(d.psi_mean))
      .attr('r', 0)
      .attr('fill', '#2C6E8A')
      .attr('opacity', 0)
      .attr('cursor', 'default')
      .on('mousemove', (event, d) => { _showTooltip(event, d) })
      .on('mouseleave', () => { _hideTooltip() })
      .interrupt()
      .transition().duration(400).ease(d3.easeQuadOut)
      .attr('r', 5)
      .attr('opacity', 0.6)

    dots.exit()
      .interrupt()
      .transition().duration(200).ease(d3.easeQuadOut)
      .attr('r', 0).attr('opacity', 0)
      .remove()

    dots
      .interrupt()
      .transition().duration(400).ease(d3.easeQuadOut)
      .attr('cx', d => _xScale(d.fire_count))
      .attr('cy', d => _yScale(d.psi_mean))
      .attr('r', 5)
      .attr('opacity', 0.6)
  }

  return { id: 'chart-scatter', init, render }
}
