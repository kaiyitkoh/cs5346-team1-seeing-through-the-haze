/**
 * Explorer Trend Chart — Annual Haze Days Bar Chart (EXPL-NEW-04)
 * Bar chart for year-over-year comparison.
 * Color: #2C6E8A teal bars.
 */

import * as d3 from 'd3'
import { broadcastFilter, filterState } from '../../explorer-state.js'

export function createTrendChart() {
  let _svg = null
  let _barsG = null
  let _items = null
  let _xScale = null
  let _yScale = null
  let _width = 0
  let _height = 0
  const margin = { top: 20, right: 20, bottom: 40, left: 50 }

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
    _tooltip.innerHTML = `<strong>${d.year}</strong><br>${d.haze_days} haze days<br>Mean PSI: ${d.psi_mean.toFixed(1)}<br>ENSO: ${d.enso_phase}`
    _tooltip.style.opacity = '1'
    _tooltip.style.left = (event.clientX + 12) + 'px'
    _tooltip.style.top = (event.clientY - 10) + 'px'
  }

  function _hideTooltip() {
    if (_tooltip) _tooltip.style.opacity = '0'
  }

  // ---- init ----
  function init(container, data, state) {
    _items = data.annual_trend || []
    if (!_items.length) return

    _width = container.clientWidth || 500
    _height = container.clientHeight || 360
    const innerHeight = _height - margin.top - margin.bottom

    _ensureTooltip()

    // Scales
    _xScale = d3.scaleBand()
      .domain(_items.map(d => d.year))
      .range([margin.left, _width - margin.right])
      .padding(0.3)

    _yScale = d3.scaleLinear()
      .domain([0, d3.max(_items, d => d.haze_days) || 1])
      .range([_height - margin.bottom, margin.top])
      .nice()

    // SVG
    const svgEl = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${_width} ${_height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')

    _svg = svgEl

    // Horizontal gridlines
    svgEl.append('g')
      .attr('class', 'gridlines')
      .selectAll('line')
      .data(_yScale.ticks(5))
      .join('line')
      .attr('x1', margin.left)
      .attr('x2', _width - margin.right)
      .attr('y1', d => _yScale(d))
      .attr('y2', d => _yScale(d))
      .attr('stroke', '#E8E4DE')
      .attr('stroke-width', 1)

    // X axis
    svgEl.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${_height - margin.bottom})`)
      .call(d3.axisBottom(_xScale).tickFormat(d => d))
      .call(g => {
        g.select('.domain').remove()
        g.selectAll('.tick line').remove()
        g.selectAll('.tick text')
          .attr('fill', '#5A5A5A')
          .attr('font-size', '12px')
          .attr('font-family', '"Public Sans",sans-serif')
      })

    // Y axis
    svgEl.append('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(_yScale).ticks(5))
      .call(g => {
        g.select('.domain').remove()
        g.selectAll('.tick line').remove()
        g.selectAll('.tick text')
          .attr('fill', '#5A5A5A')
          .attr('font-size', '12px')
          .attr('font-family', '"Public Sans",sans-serif')
      })

    // Y axis label
    svgEl.append('text')
      .attr('transform', `translate(${14},${margin.top + innerHeight / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .attr('fill', '#5A5A5A')
      .attr('font-size', '12px')
      .attr('font-family', '"Public Sans",sans-serif')
      .text('Haze Days')

    // Bars group
    _barsG = svgEl.append('g').attr('class', 'bars')

    _renderBars(_items)
  }

  function _renderBars(items) {
    if (!_barsG) return

    // Update scales
    _xScale.domain(items.map(d => d.year))
    _yScale.domain([0, d3.max(items, d => d.haze_days) || 1]).nice()

    // Update axes
    _svg.select('.x-axis')
      .transition().duration(400).ease(d3.easeCubicOut)
      .call(d3.axisBottom(_xScale).tickFormat(d => d))
      .call(g => {
        g.select('.domain').remove()
        g.selectAll('.tick line').remove()
        g.selectAll('.tick text')
          .attr('fill', '#5A5A5A').attr('font-size', '12px')
          .attr('font-family', '"Public Sans",sans-serif')
      })

    _svg.select('.y-axis')
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
    const gridData = _yScale.ticks(5)
    const gridLines = _svg.select('.gridlines').selectAll('line').data(gridData)
    gridLines.exit().remove()
    gridLines.enter().append('line').merge(gridLines)
      .transition().duration(400)
      .attr('x1', margin.left).attr('x2', _width - margin.right)
      .attr('y1', d => _yScale(d)).attr('y2', d => _yScale(d))
      .attr('stroke', '#E8E4DE').attr('stroke-width', 1)

    // D3 join for bars
    const bars = _barsG.selectAll('.trend-bar')
      .data(items, d => d.year)

    bars.exit()
      .interrupt()
      .transition().duration(200)
      .attr('height', 0).attr('y', _yScale(0))
      .remove()

    const entered = bars.enter()
      .append('rect')
      .attr('class', 'trend-bar')
      .attr('x', d => _xScale(d.year))
      .attr('y', _yScale(0))
      .attr('width', _xScale.bandwidth())
      .attr('height', 0)
      .attr('fill', '#2C6E8A')
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        const [curMin, curMax] = filterState.yearRange
        const isSingleYear = curMin === d.year && curMax === d.year
        const newRange = isSingleYear ? [2014, 2024] : [d.year, d.year]
        broadcastFilter({ yearRange: newRange })
      })
      .on('mousemove', (event, d) => { _showTooltip(event, d) })
      .on('mouseleave', () => { _hideTooltip() })

    entered.merge(bars)
      .interrupt()
      .transition()
      .duration(400)
      .ease(d3.easeQuadOut)
      .attr('x', d => _xScale(d.year))
      .attr('width', _xScale.bandwidth())
      .attr('y', d => _yScale(d.haze_days))
      .attr('height', d => _height - margin.bottom - _yScale(d.haze_days))
      .attr('fill', '#2C6E8A')
      .attr('opacity', 1)
  }

  // ---- render ----
  function render(container, filteredData, state) {
    if (!_svg || !_barsG) return
    const items = filteredData.annual_trend || []
    _renderBars(items)
  }

  return { id: 'chart-trend', init, render }
}
