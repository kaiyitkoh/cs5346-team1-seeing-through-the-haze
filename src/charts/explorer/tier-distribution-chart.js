/**
 * Explorer Risk Tier Distribution — Stacked bar by year (EXPL-NEW-09)
 * Shows % of days in each predicted tier (Good/Moderate/Unhealthy) per year.
 * Uses day_predictions data grouped by year and tier.
 * Color-coded by NEA PSI band.
 */

import * as d3 from 'd3'
import { broadcastFilter, filterState } from '../../explorer-state.js'

const TIER_COLORS = {
  'Good': '#14532D',
  'Moderate': '#92400E',
  'Unhealthy': '#C2410C',
}
const TIER_ORDER = ['Good', 'Moderate', 'Unhealthy']

export function createTierDistributionChart() {
  let _svg = null
  let _barsG = null
  let _width = 0
  let _height = 0
  let _xScale = null
  let _yScale = null
  let _allPredictions = []
  const margin = { top: 36, right: 20, bottom: 40, left: 50 }

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

  function _computeStacks(predictions) {
    const byYear = d3.group(predictions, d => d.date.slice(0, 4))
    const years = Array.from(byYear.keys()).sort()

    return years.map(year => {
      const days = byYear.get(year)
      const total = days.length
      const tierCounts = {}
      TIER_ORDER.forEach(t => { tierCounts[t] = 0 })
      days.forEach(d => {
        if (tierCounts[d.predicted_tier] !== undefined) {
          tierCounts[d.predicted_tier]++
        }
      })

      let cumPct = 0
      const segments = TIER_ORDER.map(tier => {
        const pct = total > 0 ? tierCounts[tier] / total * 100 : 0
        const seg = { year: Number(year), tier, count: tierCounts[tier], total, pct, y0: cumPct, y1: cumPct + pct }
        cumPct += pct
        return seg
      })

      return { year: Number(year), segments, total }
    })
  }

  function init(container, data, state) {
    _allPredictions = data.day_predictions || []
    if (!_allPredictions.length) return

    _width = container.clientWidth || 500
    _height = container.clientHeight || 300
    const innerHeight = _height - margin.top - margin.bottom

    _ensureTooltip()

    const stacks = _computeStacks(_allPredictions)
    const years = stacks.map(s => s.year)

    _xScale = d3.scaleBand()
      .domain(years)
      .range([margin.left, _width - margin.right])
      .padding(0.3)

    _yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([_height - margin.bottom, margin.top])

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
      .data([25, 50, 75, 100])
      .join('line')
      .attr('x1', margin.left).attr('x2', _width - margin.right)
      .attr('y1', d => _yScale(d)).attr('y2', d => _yScale(d))
      .attr('stroke', '#E8E4DE').attr('stroke-width', 1)

    // X axis
    svgEl.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${_height - margin.bottom})`)
      .call(d3.axisBottom(_xScale).tickFormat(d => d))
      .call(g => {
        g.select('.domain').remove()
        g.selectAll('.tick line').remove()
        g.selectAll('.tick text')
          .attr('fill', '#5A5A5A').attr('font-size', '12px')
          .attr('font-family', '"Public Sans",sans-serif')
      })

    // Y axis
    svgEl.append('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(_yScale).ticks(4).tickFormat(d => d + '%'))
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
      .text('% of Days')

    // Legend
    const legendG = svgEl.append('g')
      .attr('transform', `translate(${_width - margin.right - 220}, 4)`)

    TIER_ORDER.forEach((tier, i) => {
      legendG.append('rect')
        .attr('x', i * 75).attr('y', 0)
        .attr('width', 12).attr('height', 12)
        .attr('fill', TIER_COLORS[tier])
      legendG.append('text')
        .attr('x', i * 75 + 16).attr('y', 10)
        .attr('fill', '#5A5A5A').attr('font-size', '11px')
        .attr('font-family', '"Public Sans",sans-serif')
        .text(tier)
    })

    // Stacked bars group
    _barsG = svgEl.append('g').attr('class', 'stacked-bars')

    _renderStacks(stacks)
  }

  function _renderStacks(stacks) {
    if (!_barsG) return

    // Update x scale domain
    const years = stacks.map(s => s.year)
    _xScale.domain(years)

    // Update x axis
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

    const allSegs = stacks.flatMap(s => s.segments)

    const rects = _barsG.selectAll('rect')
      .data(allSegs, d => `${d.year}-${d.tier}`)

    rects.exit()
      .interrupt()
      .transition().duration(200)
      .attr('height', 0).attr('y', _yScale(0))
      .remove()

    const entered = rects.enter()
      .append('rect')
      .attr('x', d => _xScale(d.year))
      .attr('y', _yScale(0))
      .attr('width', _xScale.bandwidth())
      .attr('height', 0)
      .attr('fill', d => TIER_COLORS[d.tier])
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        const [curMin, curMax] = filterState.yearRange
        const isSingleYear = curMin === d.year && curMax === d.year
        const newRange = isSingleYear ? [2014, 2024] : [d.year, d.year]
        broadcastFilter({ yearRange: newRange })
      })
      .on('mousemove', (event, d) => {
        if (!_tooltip) return
        _tooltip.innerHTML = `<strong>${d.year}</strong><br>${d.tier}: ${d.count} days (${d.pct.toFixed(1)}%)<br>Total: ${d.total} days`
        _tooltip.style.opacity = '1'
        _tooltip.style.left = (event.clientX + 12) + 'px'
        _tooltip.style.top = (event.clientY - 10) + 'px'
      })
      .on('mouseleave', _hideTooltip)

    entered.merge(rects)
      .interrupt()
      .transition().duration(400).ease(d3.easeQuadOut)
      .attr('x', d => _xScale(d.year))
      .attr('width', _xScale.bandwidth())
      .attr('y', d => _yScale(d.y1))
      .attr('height', d => _yScale(d.y0) - _yScale(d.y1))
      .attr('fill', d => TIER_COLORS[d.tier])
      .attr('opacity', 1)
  }

  function render(container, filteredData, state) {
    if (!_svg || !_barsG) return
    const predictions = filteredData.day_predictions || []
    const stacks = _computeStacks(predictions)
    _renderStacks(stacks)
  }

  return { id: 'chart-tiers', init, render }
}
