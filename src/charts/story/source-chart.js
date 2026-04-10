/**
 * Source Chart — Story Section 2
 * Interactive SEA map with fire icon markers sized by impact score
 * Steps:
 *   0: all fire markers visible, overview of region
 *   1: Riau highlighted, others faded
 *   2: Johor highlighted, others faded
 *
 * Factory pattern: createSourceChart() returns { init, update, destroy }
 */

import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import { SECTION_CHARTS } from '../../scroll.js'

const PROVINCE_COORDS = [
  { province: 'Riau', country: 'IDN', lat: 0.5, lon: 102.5 },
  { province: 'South Sumatra', country: 'IDN', lat: -3.5, lon: 104.5 },
  { province: 'Jambi', country: 'IDN', lat: -1.8, lon: 103.5 },
  { province: 'North Sumatra', country: 'IDN', lat: 2.5, lon: 98.7 },
  { province: 'Bengkulu', country: 'IDN', lat: -3.5, lon: 102.3 },
  { province: 'Central Kalimantan', country: 'IDN', lat: -1.5, lon: 113.9 },
  { province: 'West Kalimantan', country: 'IDN', lat: 0.0, lon: 110.3 },
  { province: 'Johor', country: 'MYS', lat: 1.9, lon: 103.5 },
  { province: 'Pahang', country: 'MYS', lat: 3.8, lon: 103.3 },
  { province: 'Sarawak', country: 'MYS', lat: 2.5, lon: 113.0 },
]

const SINGAPORE = { lat: 1.35, lon: 103.82 }

// Base icon size in SVG units — scaled by impact_score via _rScale
const ICON_BASE = 44

export function createSourceChart() {
  let _container = null
  let _svg = null
  let _data = null
  let _merged = null
  let _currentStep = -1
  let _tooltip = null
  let _projection = null
  let _zoom = null
  let _rScale = null

  const WIDTH = 640
  const HEIGHT = 520
  const TOOLTIP_OFFSET = 16
  const TOOLTIP_W_EST = 170 // estimated tooltip width for flip logic
  const TOOLTIP_H_EST = 80  // estimated tooltip height for flip logic

  // Position tooltip, flip direction if cursor is near container edge
  function _positionTooltip(event) {
    if (!_tooltip || !_container) return
    const rect = _container.getBoundingClientRect()
    const mx = event.clientX - rect.left
    const my = event.clientY - rect.top

    // Flip horizontally — show left of cursor when in right half
    let x = mx + TOOLTIP_OFFSET
    if (mx > rect.width * 0.55) {
      x = mx - TOOLTIP_W_EST - TOOLTIP_OFFSET
    }
    // Flip vertically — show above cursor when in bottom half
    let y = my - TOOLTIP_H_EST - TOOLTIP_OFFSET
    if (my < rect.height * 0.4) {
      y = my + TOOLTIP_OFFSET
    }

    // Clamp within container bounds
    x = Math.max(4, Math.min(x, rect.width - TOOLTIP_W_EST - 4))
    y = Math.max(4, Math.min(y, rect.height - TOOLTIP_H_EST - 4))

    _tooltip
      .style('left', `${x}px`)
      .style('top', `${y}px`)
  }

  function init(container, data) {
    _container = container
    _data = data.province_impact

    // Clear previous render
    d3.select(container).selectAll('*').remove()

    // Merge province data with coordinates
    const coordsMap = {}
    PROVINCE_COORDS.forEach(c => { coordsMap[c.province] = c })
    _merged = _data
      .map(p => {
        const coords = coordsMap[p.province]
        if (!coords) return null
        return { ...p, lat: coords.lat, lon: coords.lon }
      })
      .filter(Boolean)

    // Projection centered on SEA
    _projection = d3.geoMercator()
      .center([106, 0])
      .scale(WIDTH * 2.2)
      .translate([WIDTH / 2, HEIGHT / 2])

    const pathGen = d3.geoPath().projection(_projection)

    // Fire marker size scale (sqrt for area perception)
    const maxImpact = d3.max(_merged, d => d.impact_score) || 1
    _rScale = d3.scaleSqrt()
      .domain([0, maxImpact])
      .range([0.35, 1.3])

    // SVG
    const svgSel = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('background', '#FAFAF8')

    _svg = svgSel.node()

    // Zoom container (title is OUTSIDE this so it stays fixed)
    const zoomG = svgSel.append('g').attr('class', 'zoom-layer')

    // Zoom behavior
    _zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        zoomG.attr('transform', event.transform)
        const k = event.transform.k
        zoomG.selectAll('.country-path').attr('stroke-width', 0.5 / k)
        // Fire icons scale naturally with zoom (no inverse scaling)
        // so they appear LARGER when zooming into a province
        zoomG.selectAll('.sg-dot').attr('r', 4 / k)
        zoomG.selectAll('.sg-label').attr('font-size', `${11 / k}px`)
        // Province name labels — scale inversely like fire icons so they match
        zoomG.selectAll('.province-name').each(function (_, i) {
          const d = _merged[i]
          if (!d) return
          const pt = _projection([d.lon, d.lat])
          const s = _rScale(d.impact_score)
          const iconSize = ICON_BASE * s
          const fontSize = Math.max(2.5, iconSize * 0.09) / k
          const padding = Math.max(6, iconSize * 0.20) / k
          d3.select(this)
            .attr('x', pt[0])
            .attr('y', pt[1] + padding)
            .attr('font-size', `${fontSize}px`)
          d3.select(this).selectAll('tspan').attr('x', pt[0])
        })
        // Scale info labels inversely so they stay readable, with flip logic
        zoomG.selectAll('.info-label').each(function (_, i) {
          const d = _merged[i]
          if (!d) return
          const pt = _projection([d.lon, d.lat])
          const s = _rScale(d.impact_score)
          const iconSize = ICON_BASE * s
          const flipLeft = pt[0] > WIDTH * 0.55 || d.province === 'Riau'
          const xOff = flipLeft ? -12 / k : 12 / k
          const yOff = -(iconSize + 70) / k
          if (flipLeft) {
            const bbox = d3.select(this).node().getBBox()
            d3.select(this).attr('transform', `translate(${pt[0] + xOff - (bbox.width + 8) / k},${pt[1] + yOff}) scale(${1 / k})`)
          } else {
            d3.select(this).attr('transform', `translate(${pt[0] + xOff},${pt[1] + yOff}) scale(${1 / k})`)
          }
        })
      })

    svgSel.call(_zoom)

    // Resolve fire icon URL via Vite's base path
    const fireIconUrl = import.meta.env.BASE_URL + 'images/fire_icon.png'

    // Load TopoJSON and draw
    d3.json(import.meta.env.BASE_URL + 'data/sea-countries.json').then(topoData => {
      const countries = topojson.feature(topoData, topoData.objects.countries)

      // Draw country boundaries
      zoomG.append('g').attr('class', 'land')
        .selectAll('path')
        .data(countries.features)
        .join('path')
        .attr('class', 'country-path')
        .attr('d', pathGen)
        .attr('fill', '#F0EEEA')
        .attr('stroke', '#D8D4CE')
        .attr('stroke-width', 0.5)

      // Singapore reference dot
      const sgPt = _projection([SINGAPORE.lon, SINGAPORE.lat])
      zoomG.append('circle')
        .attr('class', 'sg-dot')
        .attr('cx', sgPt[0])
        .attr('cy', sgPt[1])
        .attr('r', 4)
        .attr('fill', '#C0392B')
        .attr('opacity', 0.9)

      zoomG.append('text')
        .attr('class', 'sg-label')
        .attr('x', sgPt[0] + 8)
        .attr('y', sgPt[1] + 4)
        .attr('fill', '#C0392B')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('font-family', 'Public Sans, sans-serif')
        .text('Singapore')

      // Fire markers group — using <image> elements with fire_icon.png
      const markersG = zoomG.append('g').attr('class', 'fire-markers')

      markersG.selectAll('.fire-marker')
        .data(_merged)
        .join('image')
        .attr('class', d => `fire-marker fire-marker-${d.province.replace(/\s+/g, '-')}`)
        .attr('href', fireIconUrl)
        .attr('x', d => {
          const pt = _projection([d.lon, d.lat])
          const size = ICON_BASE * _rScale(d.impact_score)
          return pt[0] - size / 2
        })
        .attr('y', d => {
          const pt = _projection([d.lon, d.lat])
          const size = ICON_BASE * _rScale(d.impact_score)
          return pt[1] - size
        })
        .attr('width', d => ICON_BASE * _rScale(d.impact_score))
        .attr('height', d => ICON_BASE * _rScale(d.impact_score))
        .style('cursor', 'pointer')
        .on('mouseover', function (event, d) {
          _tooltip
            .style('opacity', 1)
            .html(
              `<strong>${d.province}</strong> (${d.country === 'IDN' ? 'Indonesia' : 'Malaysia'})<br/>` +
              `Impact Score: ${d.impact_score.toFixed(2)}<br/>` +
              `Distance: ${d.distance_km} km<br/>` +
              `Fire Count: ${d.fire_count.toLocaleString()}`
            )
          _positionTooltip(event)
        })
        .on('mousemove', function (event) {
          _positionTooltip(event)
        })
        .on('mouseout', function () {
          _tooltip.style('opacity', 0)
        })

      // Province name labels below each fire icon
      const nameLabelsG = zoomG.append('g').attr('class', 'province-names')
        .style('pointer-events', 'none')
      _merged.forEach(d => {
        const pt = _projection([d.lon, d.lat])
        const s = _rScale(d.impact_score)
        const iconSize = ICON_BASE * s
        const fontSize = Math.max(2.5, iconSize * 0.09) // smaller, proportional to icon
        const padding = Math.max(6, iconSize * 0.20) // generous gap between icon bottom and label
        const words = d.province.split(' ')
        const textEl = nameLabelsG.append('text')
          .attr('class', `province-name province-name-${d.province.replace(/\s+/g, '-')}`)
          .attr('x', pt[0])
          .attr('y', pt[1] + padding)
          .attr('text-anchor', 'middle')
          .attr('fill', '#5A5A5A')
          .attr('font-size', `${fontSize}px`)
          .attr('font-family', 'Public Sans, sans-serif')

        if (words.length > 1) {
          words.forEach((word, i) => {
            textEl.append('tspan')
              .attr('x', pt[0])
              .attr('dy', i === 0 ? 0 : '1.1em')
              .text(word)
          })
        } else {
          textEl.text(d.province)
        }
      })

      // Info labels group — shown on step transitions with province details
      const labelsG = zoomG.append('g').attr('class', 'info-labels')
        .style('pointer-events', 'none')

      _merged.forEach(d => {
        const pt = _projection([d.lon, d.lat])
        const slug = d.province.replace(/\s+/g, '-')
        const s = _rScale(d.impact_score)
        const iconSize = ICON_BASE * s
        // Position info label above the fire icon, offset horizontally to avoid the province name below
        // Special case: Central Kalimantan label sits bottom-left of its icon (avoids overlap with Johor at step 2 zoom)
        const isCK = d.province === 'Central Kalimantan'
        const flipLeft = isCK || pt[0] > WIDTH * 0.55 || d.province === 'Riau'
        const xOff = flipLeft ? -12 : 12
        const yOff = isCK ? (iconSize + 20) : -(iconSize + 70)
        const labelG = labelsG.append('g')
          .attr('class', `info-label info-label-${slug}`)
          .attr('transform', `translate(${pt[0] + xOff},${pt[1] + yOff})`)
          .attr('opacity', 0)

        // Background rect (will be sized after text is rendered)
        labelG.append('rect')
          .attr('class', 'info-label-bg')
          .attr('rx', 3)
          .attr('fill', 'white')
          .attr('stroke', '#D8D4CE')
          .attr('stroke-width', 0.5)
          .attr('opacity', 0.92)

        const countryName = d.country === 'IDN' ? 'Indonesia' : 'Malaysia'
        const lines = [
          { text: `${d.province} (${countryName})`, weight: '600' },
          { text: `Impact Score: ${d.impact_score.toFixed(2)}`, weight: '400' },
          { text: `Distance: ${d.distance_km} km`, weight: '400' },
          { text: `Fire Count: ${d.fire_count.toLocaleString()}`, weight: '400' },
        ]

        lines.forEach((line, i) => {
          labelG.append('text')
            .attr('x', 6)
            .attr('y', 14 + i * 15)
            .attr('fill', '#1A1A1A')
            .attr('font-size', '10px')
            .attr('font-weight', line.weight)
            .attr('font-family', 'Public Sans, sans-serif')
            .text(line.text)
        })

        // Size the background rect to fit the text
        const bbox = labelG.node().getBBox()
        labelG.select('.info-label-bg')
          .attr('x', bbox.x - 4)
          .attr('y', bbox.y - 2)
          .attr('width', bbox.width + 8)
          .attr('height', bbox.height + 4)

        // If flipped left, shift label so its right edge aligns with the offset point
        if (flipLeft) {
          labelG.attr('transform', `translate(${pt[0] + xOff - bbox.width - 8},${pt[1] + yOff})`)
        }
      })

      // Staggered entry animation
      markersG.selectAll('.fire-marker')
        .attr('opacity', 0)
        .transition()
        .duration(1000)
        .ease(d3.easeQuadOut)
        .delay((_, i) => i * 120)
        .attr('opacity', 1)
    })

    // Chart title — OUTSIDE zoom layer, anchored to bottom-left so it's always visible
    svgSel.append('text')
      .attr('class', 'chart-title')
      .attr('x', 16)
      .attr('y', HEIGHT - 26)
      .attr('fill', '#1A1A1A')
      .attr('font-size', '16px')
      .attr('font-weight', '600')
      .attr('font-family', 'Public Sans, sans-serif')
      .text('Fire Impact on Singapore by Province')

    svgSel.append('text')
      .attr('class', 'chart-subtitle')
      .attr('x', 16)
      .attr('y', HEIGHT - 10)
      .attr('fill', '#5A5A5A')
      .attr('font-size', '12px')
      .attr('font-style', 'italic')
      .attr('font-family', 'Public Sans, sans-serif')
      .text('Hover over provinces for more information')

    // Zoom controls — top-right, outside zoom layer
    const controlsG = svgSel.append('g')
      .attr('class', 'zoom-controls')
      .attr('transform', `translate(${WIDTH - 44}, 8)`)

    const btnStyle = (g) => {
      g.append('rect')
        .attr('width', 28).attr('height', 28).attr('rx', 4)
        .attr('fill', 'white').attr('stroke', '#D8D4CE').attr('stroke-width', 1)
        .attr('opacity', 0.9)
      g.style('cursor', 'pointer')
    }

    // Reset button
    const resetBtn = controlsG.append('g')
      .attr('class', 'zoom-reset-btn')
    btnStyle(resetBtn)
    // Home icon — simple house shape
    resetBtn.append('path')
      .attr('d', 'M14,8 L6,14 L8,14 L8,21 L12,21 L12,17 L16,17 L16,21 L20,21 L20,14 L22,14 Z')
      .attr('fill', 'none').attr('stroke', '#5A5A5A').attr('stroke-width', 1.2)
      .attr('transform', 'scale(0.85) translate(2, 1)')
    resetBtn.on('click', () => {
      svgSel.transition().duration(1000).call(_zoom.transform, d3.zoomIdentity)
    })

    // Tooltip element
    _tooltip = d3.select(container)
      .append('div')
      .attr('class', 'chart-tooltip')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('opacity', 0)

    _currentStep = 0
  }

  let _lastZoomStep = -1

  function update(stepIndex) {
    if (!_svg) return
    if (stepIndex === _currentStep) return
    _currentStep = stepIndex

    const svgSel = d3.select(_svg)

    // Zoom transitions stay time-based (only trigger on step change)
    if (stepIndex === _lastZoomStep) return
    _lastZoomStep = stepIndex

    if (stepIndex === 0) {
      svgSel.transition()
        .duration(1500)
        .call(_zoom.transform, d3.zoomIdentity)
    } else if (stepIndex === 1) {
      // Frame Riau and South Sumatra together (both Sumatran, ~450km apart)
      const riauPt = _projection([102.5, 0.5])
      const sSumPt = _projection([104.5, -3.5])
      const cx = (riauPt[0] + sSumPt[0]) / 2
      const cy = (riauPt[1] + sSumPt[1]) / 2
      const scale = 1.9
      const translate = [WIDTH / 2 - scale * cx, HEIGHT / 2 - scale * cy]
      svgSel.transition()
        .duration(1500)
        .call(
          _zoom.transform,
          d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        )
    } else if (stepIndex === 2) {
      // Frame Johor and Central Kalimantan together (~1,400km apart — wide overview)
      const johorPt = _projection([103.5, 1.9])
      const ckPt = _projection([113.9, -1.5])
      const cx = (johorPt[0] + ckPt[0]) / 2
      const cy = (johorPt[1] + ckPt[1]) / 2
      const scale = 1.5
      const translate = [WIDTH / 2 - scale * cx, HEIGHT / 2 - scale * cy]
      svgSel.transition()
        .duration(1500)
        .call(
          _zoom.transform,
          d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        )
    }
  }

  function progress(stepIndex, p) {
    if (!_svg) return

    const svgSel = d3.select(_svg)
    const zoomG = svgSel.select('.zoom-layer')
    const ep = easeQuadOut(p)

    if (stepIndex === 0) {
      // All markers fade to full opacity, info labels hidden
      zoomG.selectAll('.fire-marker').attr('opacity', 0.15 + 0.85 * ep)
      zoomG.selectAll('.province-name')
        .attr('opacity', 0.12 + 0.88 * ep)
        .attr('fill', '#5A5A5A')
      zoomG.selectAll('.info-label').attr('opacity', 0)
    } else if (stepIndex === 1) {
      // Riau + South Sumatra highlighted, others faded
      const focusSet = new Set(['Riau', 'South Sumatra'])
      _merged.forEach(d => {
        const slug = d.province.replace(/\s+/g, '-')
        const isFocus = focusSet.has(d.province)
        zoomG.select(`.fire-marker-${slug}`)
          .attr('opacity', isFocus ? 1 : 1 - 0.85 * ep)
        zoomG.select(`.province-name-${slug}`)
          .attr('opacity', isFocus ? 1 : 1 - 0.88 * ep)
          .attr('fill', isFocus ? '#5A5A5A' : d3.interpolateRgb('#5A5A5A', '#C0C0C0')(ep))
      })

      // Both info labels appear in second half of scroll
      const labelP = Math.max(0, (p - 0.5) * 2)
      const labelOpacity = easeQuadOut(labelP)
      zoomG.select('.info-label-Riau').attr('opacity', labelOpacity)
      zoomG.select('.info-label-South-Sumatra').attr('opacity', labelOpacity)
      zoomG.select('.info-label-Johor').attr('opacity', 0)
      zoomG.select('.info-label-Central-Kalimantan').attr('opacity', 0)
    } else if (stepIndex === 2) {
      // Johor + Central Kalimantan highlighted, others faded
      const focusSet = new Set(['Johor', 'Central Kalimantan'])
      _merged.forEach(d => {
        const slug = d.province.replace(/\s+/g, '-')
        const isFocus = focusSet.has(d.province)
        zoomG.select(`.fire-marker-${slug}`)
          .attr('opacity', isFocus ? 1 : 1 - 0.85 * ep)
        zoomG.select(`.province-name-${slug}`)
          .attr('opacity', isFocus ? 1 : 1 - 0.88 * ep)
          .attr('fill', isFocus ? '#5A5A5A' : d3.interpolateRgb('#5A5A5A', '#C0C0C0')(ep))
      })

      // Both info labels appear in second half of scroll
      const labelP = Math.max(0, (p - 0.5) * 2)
      const labelOpacity = easeQuadOut(labelP)
      zoomG.select('.info-label-Riau').attr('opacity', 0)
      zoomG.select('.info-label-South-Sumatra').attr('opacity', 0)
      zoomG.select('.info-label-Johor').attr('opacity', labelOpacity)
      zoomG.select('.info-label-Central-Kalimantan').attr('opacity', labelOpacity)
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
    _merged = null
    _currentStep = -1
    _projection = null
    _zoom = null
    _rScale = null
  }

  return { init, update, progress, destroy }
}

SECTION_CHARTS.source = createSourceChart()
