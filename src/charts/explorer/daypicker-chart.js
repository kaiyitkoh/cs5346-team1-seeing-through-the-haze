/**
 * Explorer Day Picker Chart — Daily PSI Risk Prediction Card (EXPL-NEW-07)
 * Redesigned card layout matching editorial aesthetic:
 *   1. Title + date picker
 *   2. "Conditions used for prediction" box with model factors
 *   3. Predicted PSI range (tier label + gauge bar) | Actual PSI recorded
 *   4. Prediction match/mismatch indicator
 *
 * NEA PSI tier colors (WCAG AA on #F0EEEA):
 *   Good            #14532D (green-900)
 *   Moderate        #92400E (amber-800)
 *   Unhealthy       #C2410C (orange-700)
 *   Very Unhealthy  #B91C1C (red-700)
 *   Hazardous       #4C1D95 (violet-900)
 *
 * Imports broadcastFilter from explorer-state.js (NOT from explorer.js).
 * Note: day picker does not broadcast filter — it is a read-only lookup tool.
 */

import * as d3 from 'd3'

const TIER_COLORS = {
  'Good': '#14532D',
  'Moderate': '#92400E',
  'Unhealthy': '#C2410C',
  'Very Unhealthy': '#B91C1C',
  'Hazardous': '#4C1D95',
}
const TIER_BG = {
  'Good': '#14532D',
  'Moderate': '#92400E',
  'Unhealthy': '#C2410C',
  'Very Unhealthy': '#B91C1C',
  'Hazardous': '#4C1D95',
}
const TIER_ORDER = ['Good', 'Moderate', 'Unhealthy', 'Very Unhealthy', 'Hazardous']

// PSI ranges for each tier (NEA bands)
const PSI_TIERS = [
  { name: 'Good', min: 0, max: 50 },
  { name: 'Moderate', min: 51, max: 100 },
  { name: 'Unhealthy', min: 101, max: 200 },
  { name: 'Very Unhealthy', min: 201, max: 300 },
  { name: 'Hazardous', min: 301, max: Infinity },
]

function psiToTier(psi) {
  if (psi == null) return null
  for (const t of PSI_TIERS) {
    if (psi >= t.min && psi <= t.max) return t.name
  }
  return null
}

// Season display names
const SEASON_LABELS = {
  'SWM': 'SW Monsoon',
  'NE': 'NE Monsoon',
  'NEM': 'NE Monsoon',
  'IM1': 'Inter-Monsoon I',
  'IM2': 'Inter-Monsoon II',
}

export function createDayPickerChart() {
  let _container = null
  let _allPredictions = []
  let _filteredPredictions = []
  let _lookup = new Map()
  let _dateInput = null
  let _noDataMsg = null
  let _resultCard = null
  let _currentDate = null

  // DOM references inside result card
  let _conditionsBox = null
  let _predictedTierLabel = null
  let _tierBarSvg = null
  let _actualPsiValue = null
  let _observedTierLabel = null
  let _matchIndicator = null

  function _buildDOM(container, predictions) {
    container.replaceChildren()
    _container = container

    const wrapper = document.createElement('div')
    wrapper.className = 'daypicker-wrapper'
    container.appendChild(wrapper)

    // Date input
    const label = document.createElement('label')
    label.textContent = 'Select a date'
    label.className = 'daypicker-label'
    wrapper.appendChild(label)

    _dateInput = document.createElement('input')
    _dateInput.type = 'date'
    if (predictions.length) {
      _dateInput.min = predictions[0].date
      _dateInput.max = predictions[predictions.length - 1].date
      _dateInput.value = predictions[predictions.length - 1].date
      _currentDate = _dateInput.value
    }
    _dateInput.className = 'daypicker-input'
    wrapper.appendChild(_dateInput)

    // No-data message
    _noDataMsg = document.createElement('p')
    _noDataMsg.className = 'daypicker-no-data'
    _noDataMsg.textContent = 'No data for this combination. Try adjusting the year range or season filter.'
    wrapper.appendChild(_noDataMsg)

    // Result card
    _resultCard = document.createElement('div')
    _resultCard.className = 'daypicker-card'
    wrapper.appendChild(_resultCard)

    // --- Conditions box ---
    _conditionsBox = document.createElement('div')
    _conditionsBox.className = 'daypicker-conditions'
    _resultCard.appendChild(_conditionsBox)

    const condTitle = document.createElement('div')
    condTitle.className = 'daypicker-conditions-title'
    condTitle.textContent = 'Conditions used to predict next-day air quality'
    _conditionsBox.appendChild(condTitle)

    // Conditions will be populated in _renderPrediction

    const condNote = document.createElement('div')
    condNote.className = 'daypicker-conditions-note'
    condNote.textContent = 'The model uses these to estimate the risk that PM2.5 will exceed the WHO daily guideline (25 µg/m³) the next day.'
    _conditionsBox.appendChild(condNote)

    // --- Prediction vs Actual row ---
    const predActualRow = document.createElement('div')
    predActualRow.className = 'daypicker-pred-actual-row'
    _resultCard.appendChild(predActualRow)

    // Left: Predicted tier
    const predCol = document.createElement('div')
    predCol.className = 'daypicker-pred-col'
    predActualRow.appendChild(predCol)

    const predLabel = document.createElement('div')
    predLabel.className = 'daypicker-section-label'
    predLabel.textContent = 'Predicted risk for next day'
    predCol.appendChild(predLabel)

    _predictedTierLabel = document.createElement('div')
    _predictedTierLabel.className = 'daypicker-tier-value'
    predCol.appendChild(_predictedTierLabel)

    // Tier gauge bar (SVG)
    const tierBarWrapper = document.createElement('div')
    tierBarWrapper.className = 'daypicker-tier-bar-wrapper'
    predCol.appendChild(tierBarWrapper)

    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svgEl.setAttribute('width', '100%')
    svgEl.setAttribute('height', '50')
    svgEl.setAttribute('viewBox', '0 0 320 50')
    svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet')
    tierBarWrapper.appendChild(svgEl)
    _tierBarSvg = d3.select(svgEl)

    const segW = 320 / 5
    TIER_ORDER.forEach((tier, i) => {
      _tierBarSvg.append('rect')
        .attr('class', `tier-seg tier-${i}`)
        .attr('x', i * segW).attr('y', 0)
        .attr('width', segW).attr('height', 16)
        .attr('fill', TIER_BG[tier])
        .attr('opacity', 0.25)
        .attr('rx', i === 0 ? 2 : 0)

      _tierBarSvg.append('text')
        .attr('x', i * segW + segW / 2).attr('y', 34)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('font-family', '"Public Sans",sans-serif')
        .attr('fill', '#5A5A5A')
        .text(tier)
    })

    // Marker triangle
    _tierBarSvg.append('polygon')
      .attr('class', 'tier-marker')
      .attr('points', '0,-4 6,4 -6,4')
      .attr('fill', '#1A1A1A')
      .attr('opacity', 0)

    // Right: Actual PSI
    const actualCol = document.createElement('div')
    actualCol.className = 'daypicker-actual-col'
    predActualRow.appendChild(actualCol)

    const actualLabel = document.createElement('div')
    actualLabel.className = 'daypicker-section-label'
    actualLabel.textContent = 'PSI recorded the next day'
    actualCol.appendChild(actualLabel)

    _actualPsiValue = document.createElement('div')
    _actualPsiValue.className = 'daypicker-actual-psi'
    actualCol.appendChild(_actualPsiValue)

    const obsLabel = document.createElement('div')
    obsLabel.className = 'daypicker-obs-label'
    obsLabel.textContent = 'Observed tier (next day)'
    actualCol.appendChild(obsLabel)

    _observedTierLabel = document.createElement('div')
    _observedTierLabel.className = 'daypicker-obs-tier'
    actualCol.appendChild(_observedTierLabel)

    // --- Match indicator ---
    _matchIndicator = document.createElement('div')
    _matchIndicator.className = 'daypicker-match'
    _resultCard.appendChild(_matchIndicator)

    // Wire date change
    _dateInput.addEventListener('change', () => {
      _currentDate = _dateInput.value
      _renderPrediction(_currentDate)
    })

    if (predictions.length) {
      _renderPrediction(_currentDate)
    }
  }

  function _renderPrediction(dateStr) {
    if (!dateStr || !_lookup.size) {
      _showEmpty()
      return
    }
    const prediction = _lookup.get(dateStr)
    if (!prediction) {
      _showEmpty()
      return
    }

    _noDataMsg.style.display = 'none'
    _resultCard.style.display = 'flex'

    const tier = prediction.predicted_tier
    const psi = prediction.next_day_psi != null ? prediction.next_day_psi : prediction.actual_psi
    const tierColor = TIER_COLORS[tier] || '#5A5A5A'
    const tierIdx = TIER_ORDER.indexOf(tier)
    const observedTier = psiToTier(psi)
    const observedColor = TIER_COLORS[observedTier] || '#5A5A5A'
    const matched = tier === observedTier

    // --- Populate conditions ---
    // Remove old condition rows (keep title and note)
    const existingRows = _conditionsBox.querySelectorAll('.daypicker-cond-row')
    existingRows.forEach(r => r.remove())

    const condNote = _conditionsBox.querySelector('.daypicker-conditions-note')

    // Build conditions from prediction data
    const conditions = []
    if (prediction.enso_phase != null) {
      conditions.push({ label: 'ENSO phase', value: prediction.enso_phase })
    }
    if (prediction.fire_idn != null) {
      conditions.push({ label: 'Fire detections (Indonesia)', value: prediction.fire_idn.toLocaleString() })
    }
    if (prediction.fire_mys != null) {
      conditions.push({ label: 'Fire detections (Malaysia)', value: prediction.fire_mys.toLocaleString() })
    }
    if (prediction.wind_impact_idn != null) {
      conditions.push({ label: 'Wind-adjusted fire impact (IDN)', value: prediction.wind_impact_idn.toLocaleString() })
    }
    if (prediction.wind_impact_mys != null) {
      conditions.push({ label: 'Wind-adjusted fire impact (MYS)', value: prediction.wind_impact_mys.toLocaleString() })
    }
    if (prediction.rainfall_mm != null) {
      conditions.push({ label: 'Rainfall', value: `${prediction.rainfall_mm.toLocaleString()} mm` })
    }
    if (prediction.wind_speed != null) {
      conditions.push({ label: 'Wind speed', value: `${prediction.wind_speed} m/s` })
    }
    if (prediction.pm25 != null) {
      conditions.push({ label: 'PM2.5 (selected date)', value: `${prediction.pm25} µg/m³` })
    }
    if (prediction.oni != null) {
      conditions.push({ label: 'ONI index', value: prediction.oni.toFixed(2) })
    }
    if (prediction.season != null) {
      conditions.push({ label: 'Season', value: SEASON_LABELS[prediction.season] || prediction.season })
    }

    conditions.forEach(c => {
      const row = document.createElement('div')
      row.className = 'daypicker-cond-row'
      const lbl = document.createElement('span')
      lbl.className = 'daypicker-cond-label'
      lbl.textContent = c.label
      const val = document.createElement('span')
      val.className = 'daypicker-cond-value'
      val.textContent = c.value
      row.appendChild(lbl)
      row.appendChild(val)
      _conditionsBox.insertBefore(row, condNote)
    })

    // --- Predicted tier ---
    _predictedTierLabel.textContent = tier
    _predictedTierLabel.style.color = tierColor

    // --- Tier bar ---
    if (_tierBarSvg) {
      TIER_ORDER.forEach((t, i) => {
        _tierBarSvg.select(`.tier-${i}`)
          .transition().duration(300).ease(d3.easeCubicOut)
          .attr('opacity', i === tierIdx ? 1 : 0.15)
      })
      if (tierIdx >= 0) {
        const segW = 320 / 5
        const markerX = tierIdx * segW + segW / 2
        _tierBarSvg.select('.tier-marker')
          .transition().duration(300).ease(d3.easeCubicOut)
          .attr('transform', `translate(${markerX}, 16)`)
          .attr('opacity', 1)
      }
    }

    // --- Actual PSI ---
    _actualPsiValue.textContent = psi != null ? Math.round(psi) : '—'
    _actualPsiValue.style.color = observedColor

    _observedTierLabel.textContent = observedTier || '—'
    _observedTierLabel.style.color = observedColor

    // --- Match indicator ---
    if (matched) {
      _matchIndicator.innerHTML = '<span class="daypicker-match-icon">&#10003;</span> Prediction matched the next day\'s observed tier'
      _matchIndicator.className = 'daypicker-match daypicker-match--yes'
    } else {
      _matchIndicator.innerHTML = '<span class="daypicker-match-icon">&#10007;</span> Prediction differed from the next day\'s observed tier'
      _matchIndicator.className = 'daypicker-match daypicker-match--no'
    }
  }

  function _showEmpty() {
    if (_noDataMsg) _noDataMsg.style.display = 'block'
    if (_resultCard) _resultCard.style.display = 'none'
  }

  function _buildLookup(predictions) {
    _lookup = new Map(predictions.map(d => [d.date, d]))
  }

  function init(container, data, state) {
    _allPredictions = data.day_predictions || []
    _filteredPredictions = [..._allPredictions]
    _buildLookup(_filteredPredictions)
    _buildDOM(container, _filteredPredictions)
  }

  function render(container, filteredData, state) {
    _filteredPredictions = filteredData.day_predictions || []
    _buildLookup(_filteredPredictions)

    if (_dateInput && _filteredPredictions.length) {
      _dateInput.min = _filteredPredictions[0].date
      _dateInput.max = _filteredPredictions[_filteredPredictions.length - 1].date

      if (_currentDate && !_lookup.has(_currentDate)) {
        const sorted = _filteredPredictions.map(d => d.date).sort()
        const before = sorted.filter(d => d <= _currentDate)
        _currentDate = before.length ? before[before.length - 1] : sorted[0]
        _dateInput.value = _currentDate
      }
    } else if (_dateInput && _filteredPredictions.length === 0) {
      _dateInput.min = ''
      _dateInput.max = ''
    }

    if (_currentDate && _filteredPredictions.length > 0) {
      _renderPrediction(_currentDate)
    } else {
      _showEmpty()
    }
  }

  return { id: 'chart-daypicker', init, render }
}
