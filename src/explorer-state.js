import noUiSlider from 'nouislider'
import 'nouislider/dist/nouislider.css'

// Filter state — multi-select model
export const filterState = {
  yearRange: [2014, 2024],  // [min, max] from range slider
  seasons: [],               // empty = all; ['sw-monsoon'] = only that season
  ensoPhases: [],            // empty = all; ['el-nino','neutral'] = those selected
}

const listeners = []

export function onFilterChange(fn) {
  listeners.push(fn)
}

// Helper: check if state is at defaults (no active filter)
export function isDefaultState(state) {
  return state.yearRange[0] === 2014 && state.yearRange[1] === 2024
    && state.seasons.length === 0 && state.ensoPhases.length === 0
}

export function broadcastFilter(patch) {
  // Deep equality check for arrays
  const changed = Object.entries(patch).some(([k, v]) => {
    const cur = filterState[k]
    if (Array.isArray(v) && Array.isArray(cur)) {
      return v.length !== cur.length || v.some((val, i) => val !== cur[i])
    }
    return cur !== v
  })
  if (!changed) return

  Object.assign(filterState, patch)
  listeners.forEach(fn => fn({ ...filterState }))
  updateFilterChips()
}

function updateFilterChips() {
  const container = document.getElementById('filter-chips')
  if (!container) return
  container.innerHTML = ''

  // Year range chip
  if (filterState.yearRange[0] !== 2014 || filterState.yearRange[1] !== 2024) {
    const chip = _createChip(
      `${filterState.yearRange[0]}–${filterState.yearRange[1]}`,
      () => {
        broadcastFilter({ yearRange: [2014, 2024] })
        // Sync slider
        const slider = document.getElementById('year-slider')
        if (slider?.noUiSlider) slider.noUiSlider.set([2014, 2024])
      }
    )
    container.appendChild(chip)
  }

  // Season chips
  const seasonLabels = {
    'sw-monsoon': 'SW Monsoon',
    'ne-monsoon': 'NE Monsoon',
    'inter-monsoon': 'Inter-Monsoon',
  }
  filterState.seasons.forEach(s => {
    const chip = _createChip(seasonLabels[s] || s, () => {
      const next = filterState.seasons.filter(x => x !== s)
      broadcastFilter({ seasons: next })
      _syncPillsToState()
    })
    container.appendChild(chip)
  })

  // ENSO chips
  const ensoLabels = {
    'el-nino': 'El Nino',
    'la-nina': 'La Nina',
    'neutral': 'Neutral',
  }
  filterState.ensoPhases.forEach(e => {
    const chip = _createChip(ensoLabels[e] || e, () => {
      const next = filterState.ensoPhases.filter(x => x !== e)
      broadcastFilter({ ensoPhases: next })
      _syncPillsToState()
    })
    container.appendChild(chip)
  })

  // Show/hide reset button
  const resetBtn = document.getElementById('filter-reset')
  if (resetBtn) {
    const hasActive = !isDefaultState(filterState)
    resetBtn.style.display = hasActive ? '' : 'none'
  }

  // Sync year slider position to match filterState (e.g., after chart click)
  const slider = document.getElementById('year-slider')
  if (slider?.noUiSlider) {
    const [curMin, curMax] = slider.noUiSlider.get().map(Number)
    if (curMin !== filterState.yearRange[0] || curMax !== filterState.yearRange[1]) {
      slider.noUiSlider.set(filterState.yearRange)
    }
  }
}

function _createChip(label, onRemove) {
  const chip = document.createElement('span')
  chip.className = 'filter-chip'
  chip.textContent = `${label} `
  const x = document.createElement('span')
  x.textContent = '\u00d7'
  x.className = 'filter-chip__close'
  chip.appendChild(x)
  chip.addEventListener('click', onRemove)
  return chip
}

function _syncPillsToState() {
  // Sync checkbox pills to match filterState
  document.querySelectorAll('#season-pills input[type="checkbox"]').forEach(cb => {
    cb.checked = filterState.seasons.includes(cb.value)
  })
  document.querySelectorAll('#enso-pills input[type="checkbox"]').forEach(cb => {
    cb.checked = filterState.ensoPhases.includes(cb.value)
  })
}

export function initFilterControls() {
  // ---- Year range slider (noUiSlider) ----
  const sliderEl = document.getElementById('year-slider')
  if (sliderEl) {
    noUiSlider.create(sliderEl, {
      start: [2014, 2024],
      connect: true,
      step: 1,
      range: { min: 2014, max: 2024 },
      format: {
        to: v => Math.round(v),
        from: v => Number(v),
      },
      tooltips: false,
      pips: {
        mode: 'values',
        values: [2014, 2017, 2020, 2024],
        density: 10,
        format: { to: v => Math.round(v) },
      },
    })

    sliderEl.noUiSlider.on('change', (values) => {
      broadcastFilter({ yearRange: [Number(values[0]), Number(values[1])] })
    })
  }

  // ---- Season pill toggles ----
  const seasonContainer = document.getElementById('season-pills')
  if (seasonContainer) {
    seasonContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const checked = Array.from(seasonContainer.querySelectorAll('input:checked')).map(el => el.value)
        broadcastFilter({ seasons: checked })
      })
    })
  }

  // ---- ENSO pill toggles ----
  const ensoContainer = document.getElementById('enso-pills')
  if (ensoContainer) {
    ensoContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const checked = Array.from(ensoContainer.querySelectorAll('input:checked')).map(el => el.value)
        broadcastFilter({ ensoPhases: checked })
      })
    })
  }

  // ---- Reset button ----
  const resetBtn = document.getElementById('filter-reset')
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      broadcastFilter({ yearRange: [2014, 2024], seasons: [], ensoPhases: [] })
      // Sync slider
      const slider = document.getElementById('year-slider')
      if (slider?.noUiSlider) slider.noUiSlider.set([2014, 2024])
      _syncPillsToState()
    })
  }
}
