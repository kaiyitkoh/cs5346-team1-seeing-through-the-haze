/**
 * Explorer Province Bar Chart — Top Fire Provinces by Impact Score (EXPL-NEW-06)
 * Horizontal bar chart with animated transitions on filter changes.
 * Sequential color scale: #6B9FAF (rank 10) to #1B4F5C (rank 1).
 */

import * as d3 from 'd3'

export function createProvinceBarChart() {
  let _svg = null
  let _barsG = null
  let _labelsG = null
  let _xScale = null
  let _yScale = null
  let _colorScale = null
  let _width = 0
  let _height = 0
  const margin = { top: 20, right: 80, bottom: 40, left: 140 }

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
    _tooltip.innerHTML = [
      `<strong>${d.province}</strong>`,
      `Impact score: ${d.impact_score.toFixed(2)}`,
      `Fire count: ${d.fire_count.toLocaleString()}`,
      `Distance: ${d.distance_km} km`,
    ].join('<br>')
    _tooltip.style.opacity = '1'
    _tooltip.style.left = (event.clientX + 12) + 'px'
    _tooltip.style.top = (event.clientY - 10) + 'px'
  }

  function _hideTooltip() {
    if (_tooltip) _tooltip.style.opacity = '0'
  }

  // ---- init ----
  function init(container, data, state) {
    const items = [...(data.province_bar || [])].sort((a, b) => b.impact_score - a.impact_score).slice(0, 10)
    if (!items.length) return

    _width = container.clientWidth || 500
    _height = container.clientHeight || 360

    _ensureTooltip()

    // Scales
    _colorScale = d3.scaleSequential()
      .domain(d3.extent(items, d => d.impact_score))
      .interpolator(d3.interpolate('#6B9FAF', '#1B4F5C'))

    _yScale = d3.scaleBand()
      .domain(items.map(d => d.province))
      .range([margin.top, _height - margin.bottom])
      .padding(0.25)

    _xScale = d3.scaleLinear()
      .domain([0, d3.max(items, d => d.impact_score) || 1])
      .range([margin.left, _width - margin.right])
      .nice()

    const innerWidth = _width - margin.left - margin.right

    // SVG
    const svgEl = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${_width} ${_height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')

    _svg = svgEl

    // Vertical gridlines
    svgEl.append('g').attr('class', 'gridlines')

    // X axis
    svgEl.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${_height - margin.bottom})`)

    // X axis label
    svgEl.append('text')
      .attr('x', margin.left + innerWidth / 2).attr('y', _height - 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#5A5A5A').attr('font-size', '12px')
      .attr('font-family', '"Public Sans",sans-serif')
      .text('Impact Score')

    // Y axis
    svgEl.append('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${margin.left},0)`)

    // Bars and labels groups
    _barsG = svgEl.append('g').attr('class', 'bars')
    _labelsG = svgEl.append('g').attr('class', 'value-labels')

    _renderBars(items)
  }

  function _renderBars(items) {
    if (!_svg || !_barsG) return

    // Update scales
    _colorScale.domain(d3.extent(items, d => d.impact_score))
    _yScale.domain(items.map(d => d.province))
    _xScale.domain([0, d3.max(items, d => d.impact_score) || 1]).nice()

    // Update axes
    _svg.select('.x-axis')
      .transition().duration(400).ease(d3.easeCubicOut)
      .call(d3.axisBottom(_xScale).ticks(4))
      .call(g => {
        g.select('.domain').remove()
        g.selectAll('.tick line').remove()
        g.selectAll('.tick text')
          .attr('fill', '#5A5A5A').attr('font-size', '12px')
          .attr('font-family', '"Public Sans",sans-serif')
      })

    _svg.select('.y-axis')
      .transition().duration(400).ease(d3.easeCubicOut)
      .call(d3.axisLeft(_yScale))
      .call(g => {
        g.select('.domain').remove()
        g.selectAll('.tick line').remove()
        g.selectAll('.tick text')
          .attr('fill', '#5A5A5A').attr('font-size', '12px')
          .attr('font-family', '"Public Sans",sans-serif')
      })

    // Update gridlines
    const gridData = _xScale.ticks(4)
    const gridLines = _svg.select('.gridlines').selectAll('line').data(gridData)
    gridLines.exit().remove()
    gridLines.enter().append('line').merge(gridLines)
      .transition().duration(400)
      .attr('x1', d => _xScale(d)).attr('x2', d => _xScale(d))
      .attr('y1', margin.top).attr('y2', _height - margin.bottom)
      .attr('stroke', '#E8E4DE').attr('stroke-width', 1)

    // D3 join for bars
    const bars = _barsG.selectAll('.prov-bar')
      .data(items, d => d.province)

    bars.exit()
      .interrupt()
      .transition().duration(200)
      .attr('width', 0)
      .remove()

    const entered = bars.enter()
      .append('rect')
      .attr('class', 'prov-bar')
      .attr('x', margin.left)
      .attr('y', d => _yScale(d.province))
      .attr('width', 0)
      .attr('height', _yScale.bandwidth())
      .attr('fill', d => _colorScale(d.impact_score))
      .on('mousemove', (event, d) => { _showTooltip(event, d) })
      .on('mouseleave', () => { _hideTooltip() })

    entered.merge(bars)
      .interrupt()
      .transition().duration(400).ease(d3.easeQuadOut)
      .attr('y', d => _yScale(d.province))
      .attr('width', d => Math.max(0, _xScale(d.impact_score) - margin.left))
      .attr('height', _yScale.bandwidth())
      .attr('fill', d => _colorScale(d.impact_score))

    // D3 join for value labels
    const labels = _labelsG.selectAll('text')
      .data(items, d => d.province)

    labels.exit()
      .interrupt()
      .transition().duration(200)
      .attr('opacity', 0)
      .remove()

    const enteredLabels = labels.enter()
      .append('text')
      .attr('fill', '#5A5A5A')
      .attr('font-size', '11px')
      .attr('font-family', '"Public Sans",sans-serif')
      .attr('opacity', 0)

    enteredLabels.merge(labels)
      .interrupt()
      .transition().duration(400).ease(d3.easeQuadOut)
      .attr('x', d => _xScale(d.impact_score) + 4)
      .attr('y', d => _yScale(d.province) + _yScale.bandwidth() / 2 + 4)
      .attr('opacity', 1)
      .text(d => d.impact_score.toFixed(2))
  }

  // ---- render ----
  function render(container, filteredData, state) {
    if (!_svg || !_barsG) return
    const items = [...(filteredData.province_bar || [])].sort((a, b) => b.impact_score - a.impact_score).slice(0, 10)
    if (items.length) _renderBars(items)
  }

  return { id: 'chart-province', init, render }
}
